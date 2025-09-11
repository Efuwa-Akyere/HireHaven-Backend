import jwt from 'jsonwebtoken';
import { User, JobSeeker, Company } from '../models/index.js';

// Generate JWT token
const generateToken = (userId, userType) => {
    return jwt.sign(
        { userId, userType },
        process.env.JWT_SECRET || 'hirehaven_secret_key_2024',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ message: 'Access token is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hirehaven_secret_key_2024');
        
        // Verify user still exists
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        // Attach profileId for convenience
        let profileId;
        if (user.userType === 'jobseeker') {
            const profile = await JobSeeker.findOne({ userId: user._id }).select('_id');
            profileId = profile?._id;
        } else if (user.userType === 'employer') {
            const profile = await Company.findOne({ userId: user._id }).select('_id');
            profileId = profile?._id;
        }

        req.user = {
            id: user._id,
            email: user.email,
            userType: user.userType,
            emailVerified: user.emailVerified,
            profileId
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(500).json({ message: 'Token verification failed' });
    }
};

// Check if user is job seeker
const requireJobSeeker = (req, res, next) => {
    if (req.user.userType !== 'jobseeker') {
        return res.status(403).json({ message: 'Access denied. Job seeker account required.' });
    }
    next();
};

// Check if user is employer
const requireEmployer = (req, res, next) => {
    if (req.user.userType !== 'employer') {
        return res.status(403).json({ message: 'Access denied. Employer account required.' });
    }
    next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hirehaven_secret_key_2024');
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.isActive) {
                let profileId;
                if (user.userType === 'jobseeker') {
                    const profile = await JobSeeker.findOne({ userId: user._id }).select('_id');
                    profileId = profile?._id;
                } else if (user.userType === 'employer') {
                    const profile = await Company.findOne({ userId: user._id }).select('_id');
                    profileId = profile?._id;
                }

                req.user = {
                    id: user._id,
                    email: user.email,
                    userType: user.userType,
                    emailVerified: user.emailVerified,
                    profileId
                };
            }
        }
        next();
    } catch {
        next();
    }
};

// Rate limiting for sensitive operations
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        // Clean old entries
        for (const [k, v] of attempts.entries()) {
            if (now - v.timestamp > windowMs) {
                attempts.delete(k);
            }
        }
        
        const userAttempts = attempts.get(key);
        
        if (!userAttempts) {
            attempts.set(key, { count: 1, timestamp: now });
            return next();
        }
        
        if (userAttempts.count >= max) {
            return res.status(429).json({ 
                message: 'Too many attempts. Please try again later.',
                retryAfter: Math.ceil((userAttempts.timestamp + windowMs - now) / 1000)
            });
        }
        
        userAttempts.count++;
        next();
    };
};

// Validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                message: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        next();
    };
};

// Error handler wrapper for async functions
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// CORS configuration for API
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com', 'https://www.yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

export {
    generateToken,
    authenticateToken,
    requireJobSeeker,
    requireEmployer,
    optionalAuth,
    createRateLimit,
    validateRequest,
    asyncHandler,
    corsOptions
};