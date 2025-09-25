import jwt from 'jsonwebtoken';
import Employer from '../models/employer.js';

export const protect = async(req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if(!token) {
            const error = new Error('You are not logged in');
            error.status = 404;
            return next(error);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const employer = await Employer.findById(decoded.id);

        if(!employer) {
            const error = new Error('The The employer with given token does not exist');
            error.statusCode = 401;
            return next(error);
        }

        req.employer = employer;
    } catch (error) {
        next(error);
        
    }
}