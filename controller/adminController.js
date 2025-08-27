import jwt from 'jsonwebtoken';
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