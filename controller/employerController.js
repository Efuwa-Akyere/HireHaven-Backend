import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Employer from "../models/employer.js";
import crypto from 'crypto';
import { sendMail } from '../config/sendMail.js';

export const addEmployer = async (req, res, next) => {
    const {username, password, email} = req.body;

    if (!username || !password || !email) {
        const error = new Error('all fields are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
       const employer = await Employer.create(req.body);
       
       const token = jwt.sign({id: employer._id}, process.env.JWT_SECRET, {expiresIn: '1d'});

       res.cookie('jwt', token,{
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
       });

       res.status(201).json({
        success: true,
        statusCode: 200,
        employer
       })
    } catch (error) {
        next(error);
    }
}

export const employerLogin = async (req, res, next) => {
    const { email, password} = req.body;
    if(!email || !password  ) {
        const error = new Error('email or password are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const employer = await Employer.findOne({email});

        if(!employer) {
            const error = new Error('Incorrect username or password');
            error.statusCode = 401;
            return next(error);
        }

        const isMatched = await bcrypt.compare(password, employer.password)

        if(!isMatched) {
            const error = new Error('Incorrect or password');
            error.statusCode = 400;
            return next(error);
        }

        const token = jwt.sign({id: employer._id}, process.env.JWT_SECRET, {expiresIn: '1d'});

        res.cookie('jwt',token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(200).json({
            success:true,
            statusCode: 200,
            employer
        });
    } catch (error) {
        next(error);
    }
}

export const employerInfo = async (req, res, next) => {
    const token = req.cookies.jwt;

    try {
        if(!token) {
            const error = new Error('You are not logged in');
            error.status = 404;
            return next(error);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const employer = await Employer.findById(decoded.id).select('-password');

        if(!employer) {
            const error = new Error('The employer with the given token does not exist');
            error.statusCode = 401;
            return next(error);
        }

        res.status(200).json({
            success: true,
            statusCode: 200,
            employer
        })
    } catch (error) {
        next(error);
    }
}


export const employerLogout = async (req, res, next) => {
    try {
        res.cookie('jwt', '', {
            httpOnly: true,
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(200).json({
            success: true,
            statusCode: 200,
            
        })
    } catch (error) {
        next(error);
    }
}


export const employerForgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const employer = await Employer.findOne({ email });

        if (!employer) {
            const error = new Error('We could not find an employer with the given email');
            error.statusCode = 404;
            return next(error);
        }

        const resetToken = employer.generatePasswordResetToken();
        await employer.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://localhost:5173/eresetpassword/${resetToken}`;

        const subject = `There has been a password reset request, follow the link provided`;

        const html = `<p> This is the reset link </p>
                    <a href="${resetUrl}"
                    target="_blank"> Follow Link </a>`

        try {
            sendMail({
                to: employer.email,
                subject,
                html,
            });

            res.status(200).json({
                success: true,
                message: 'Link has been sent to your email successfully'
            })
        } catch (error) {
           employer.resetPasswordToken = undefined;
           employer.resetPasswordTokenExpire = undefined;
           employer.save({ validateBeforeSave: true});
           next(error);
        }

    } catch (error) {
      next(error);
    }
};


export const employerResetPassword = async (req, res, next) => {
    try {
        const {resetPasswordToken} = req.params;
        const hashed = crypto.createHash('sha256').update(resetPasswordToken).digest('hex');

        const employer = await Employer.findOne({resetPasswordToken: hashed, resetPasswordTokenExpire: {$gt: Date.now()}});

        if(!employer) {
            const error = new Error('The link or token has expired');
            error.statusCode = 400;
            return next(error);
        }

        employer.password = req.body.password;
        employer.resetPasswordToken = undefined;
        employer.resetPasswordTokenExpire = undefined;

        await employer.save();

        res.status(200).json({
            success: true,
            message: 'password reset successful'
        })
    } catch (error) {
        next(error);
    }
}


