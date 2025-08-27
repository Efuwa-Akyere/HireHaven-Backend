import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Employer from "../models/employer.js";

export const addEmployer = async (req, res, next) => {
    const {username, password} = req.body;

    if (!username || !password) {
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
    const {username, password} = req.body;
    if(!username || !password) {
        const error = new Error('username or password are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const employer = await Employer.findOne({username});

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