import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/admin.js';

export const addAdmin = async (req, res, next) => {
    const {username, password} = req.body;

    if (!username || !password) {
        const error = new Error('all fields are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
       const admin = await Admin.create(req.body);
       
       const token = jwt.sign({id: admin._id}, process.env.JWT_SECRET, {expiresIn: '1d'});

       res.cookie('jwt', token,{
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
    const {username, password} = req.body;
    if(!username || !password) {
        const error = new Error('username or password are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const admin = await Admin.findOne({username});

        if(!admin) {
            const error = new Error('Incorrect username or password');
            error.statusCode = 401;
            return next(error);
        }

        const isMatched = await bcrypt.compare(password, admin.password)

        if(!isMatched) {
            const error = new Error('Incorrect or password');
            error.statusCode = 400;
            return next(error);
        }

        const token = jwt.sign({id: admin._id}, process.env.JWT_SECRET, {expiresIn: '1d'});

        res.cookie('jwt',token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(200).json({
            success:true,
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
        if(!token) {
            const error = new Error('You are not logged in');
            error.status = 404;
            return next(error);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');

        if(!admin) {
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