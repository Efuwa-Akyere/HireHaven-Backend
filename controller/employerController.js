import jwt from 'jsonwebtoken';
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