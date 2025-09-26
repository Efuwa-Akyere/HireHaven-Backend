import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/admin.js';
import { sendMail } from '../config/sendMail.js';
import crypto from 'crypto';

export const addAdmin = async (req, res, next) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        const error = new Error('all fields are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const admin = await Admin.create(req.body);

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(201).json({
            success: true,
            statusCode: 200,
            admin
        })
    } catch (error) {
        next(error);
    }
}


export const adminLogin = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        const error = new Error('username or password are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            const error = new Error('Incorrect username or password');
            error.statusCode = 401;
            return next(error);
        }

        const isMatched = await bcrypt.compare(password, admin.password)

        if (!isMatched) {
            const error = new Error('Incorrect or password');
            error.statusCode = 400;
            return next(error);
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1m' });

        const refreshToken = jwt.sign({ id: admin._id },
            process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }
        )

        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: 1 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
        });

        res.cookie('refreshJwt', refreshToken, {
            maxAge: 7 * 24 * 60 * 60 * 1000,//7days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        })

        res.status(200).json({
            success: true,
            statusCode: 200,
            admin
        });
    } catch (error) {
        next(error);
    }
}


export const adminInfo = async (req, res, next) => {
    const token = req.cookies.jwt;

    try {
        if (!token) {
            const error = new Error('You are not logged in');
            error.status = 404;
            return next(error);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            const error = new Error('The admin with the given token does not exist');
            error.statusCode = 401;
            return next(error);
        }

        res.status(200).json({
            success: true,
            statusCode: 200,
            admin
        })
    } catch (error) {
        next(error);
    }
}



export const adminLogout = async (req, res, next) => {
    try {
        res.clearCookie('jwt', {
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

export const adminForgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            const error = new Error('We could not find an admin with the given email');
            error.statusCode = 404;
            return next(error);
        }

        const resetToken = admin.generatePasswordResetToken();
        await admin.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://localhost:5173/aresetpassword/${resetToken}`;

        const subject = `There has been a password reset request, follow the link provided`;

        const html = `<p> This is the reset link </p>
                    <a href="${resetUrl}"
                    target="_blank"> Follow Link </a>`

        try {
            sendMail({
                to: admin.email,
                subject,
                html,
            });

            res.status(200).json({
                success: true,
                message: 'Link has been sent to your email successfully'
            })
        } catch (error) {
            admin.resetPasswordToken = undefined;
            admin.resetPasswordTokenExpire = undefined;
            admin.save({ validateBeforeSave: true });
            next(error);
        }

    } catch (error) {
        next(error);
    }
}

export const adminResetPassword = async (req, res, next) => {
    try {
        const { resetPasswordToken } = req.params;
        const hashed = crypto.createHash('sha256').update(resetPasswordToken).digest('hex');

        const admin = await Admin.findOne({ resetPasswordToken: hashed, resetPasswordTokenExpire: { $gt: Date.now() } });

        if (!admin) {
            const error = new Error('The link or token has expired');
            error.statusCode = 400;
            return next(error);
        }

        admin.password = req.body.password;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordTokenExpire = undefined;

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'password reset successful'
        })
    } catch (error) {
        next(error);
    }
}

export const googleAuthSuccess = async (req, res) => {
    try {
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
            expiresIn: '1m'
        });

        const refreshToken = jwt.sign({ id: req.user._id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '1d'
        });

        res.cookie('jwt', token, {
            maxAge: 1 * 60 * 1000,//1days
            httpOnly: true,

        });

        res.cookie('refreshJwt', refreshToken, {
            maxAge: 1 * 24 * 60 * 1000,//1days
            httpOnly: true,

        });

        res.redirect(`${process.env.CLIENT_URL}/rootLayout`)
    } catch (error) {
        console.log(error)
        res.redirect(`${process.env.CLIENT_URL}/alogin`)
    }
};

export const googleAuthFailure = (req, res, next) => {
    res.redirect(`${process.env.CLIENT_URL}/auth/failure`)
};

export const isAuthenticated = (req, res, next) => {
    try {
        if (isAuthenticated()) {
            return next();
        }

        const error = new Error('You need to be logged in to access this resource');
        error.statusCode = 401;
        next(error);
    } catch (error) {
        console.log(error)
        next();
    }
}


export const linkedinAuthSuccess = async (req, res) => {
    try {
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
            expiresIn: '1m'
        });

        const refreshToken = jwt.sign({ id: req.user._id }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '1d'
        });

        res.cookie('jwt', token, {
            maxAge: 1 * 60 * 1000,//1days
            httpOnly: true,

        });

        res.cookie('refreshJwt', refreshToken, {
            maxAge: 1 * 24 * 60 * 1000,//1days
            httpOnly: true,

        });

        res.redirect(`${process.env.CLIENT_URL}/rootLayout`)
    } catch (error) {
        console.log(error)
        res.redirect(`${process.env.CLIENT_URL}/alogin`)
    }
};


export const linkedinAuthFailure = (req, res, next) => {
    res.redirect(`${process.env.CLIENT_URL}/alogin`)
};

export const isLinkedinAuthenticated = (req, res, next) => {
    try {
        if (isLinkedinAuthenticated()) {
            return next();
        }

        const error = new Error('You need to be logged in to access this resource');
        error.statusCode = 401;
        next(error);
    } catch (error) {
        console.log(error)
        next();
    }
}

