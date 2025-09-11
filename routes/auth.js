import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { User, JobSeeker, Company } from '../models/index.js';
import { 
    generateToken, 
    authenticateToken, 
    createRateLimit, 
    validateRequest,
    asyncHandler 
} from '../middleware/auth.js';


const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    userType: Joi.string().valid('jobseeker', 'employer').required(),
    firstName: Joi.string().when('userType', { is: 'jobseeker', then: Joi.required() }),
    lastName: Joi.string().when('userType', { is: 'jobseeker', then: Joi.required() }),
    companyName: Joi.string().when('userType', { is: 'employer', then: Joi.required() }),
    industry: Joi.string().when('userType', { is: 'employer', then: Joi.required() }),
    companySize: Joi.string().when('userType', { 
        is: 'employer', 
        then: Joi.valid('1-10', '11-50', '51-100', '101-500', '501-1000', '1000+').required() 
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const passwordResetSchema = Joi.object({
    email: Joi.string().email().required()
});

// Jobseeker convenience schemas
const jobseekerRegisterSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required()
});

const jobseekerLoginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Rate limiting
const authRateLimit = createRateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 minutes

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', 
    authRateLimit,
    validateRequest(registerSchema),
    asyncHandler(async (req, res) => {
        const { email, password, userType, firstName, lastName, companyName, industry, companySize } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user
        const user = new User({
            email,
            password,
            userType
        });

        await user.save();

        // Create profile based on user type
        let profile;
        if (userType === 'jobseeker') {
            profile = new JobSeeker({
                userId: user._id,
                firstName,
                lastName
            });
        } else {
            profile = new Company({
                userId: user._id,
                companyName,
                industry,
                companySize
            });
        }

        await profile.save();

        // Generate token
        const token = generateToken(user._id, user.userType);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                userType: user.userType,
                emailVerified: user.emailVerified
            },
            profile: {
                id: profile._id,
                ...(userType === 'jobseeker' ? 
                    { firstName: profile.firstName, lastName: profile.lastName } :
                    { companyName: profile.companyName, industry: profile.industry }
                )
            }
        });
    })
);

// @route   POST /api/auth/jobseeker/signup
// @desc    Register a job seeker (convenience endpoint)
// @access  Public
router.post('/jobseeker/signup',
    authRateLimit,
    validateRequest(jobseekerRegisterSchema),
    asyncHandler(async (req, res) => {
        const { email, password, firstName, lastName } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const user = new User({ email, password, userType: 'jobseeker' });
        await user.save();

        const profile = new JobSeeker({ userId: user._id, firstName, lastName });
        await profile.save();

        const token = generateToken(user._id, user.userType);
        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({
            message: 'Job seeker registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                userType: user.userType,
                emailVerified: user.emailVerified
            },
            profile: {
                id: profile._id,
                firstName: profile.firstName,
                lastName: profile.lastName
            }
        });
    })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
    authRateLimit,
    validateRequest(loginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(400).json({ message: 'Account is deactivated. Please contact support.' });
        }

        // Validate password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id, user.userType);

        // Get profile data
        let profile;
        if (user.userType === 'jobseeker') {
            profile = await JobSeeker.findOne({ userId: user._id });
        } else {
            profile = await Company.findOne({ userId: user._id });
        }

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                userType: user.userType,
                emailVerified: user.emailVerified,
                lastLogin: user.lastLogin
            },
            profile: profile ? {
                id: profile._id,
                ...(user.userType === 'jobseeker' ? 
                    { 
                        firstName: profile.firstName, 
                        lastName: profile.lastName,
                        phone: profile.phone,
                        location: profile.location,
                        skills: profile.skills
                    } :
                    { 
                        companyName: profile.companyName, 
                        industry: profile.industry,
                        companySize: profile.companySize,
                        website: profile.website
                    }
                )
            } : null
        });
    })
);

// @route   POST /api/auth/jobseeker/login
// @desc    Login a job seeker (convenience endpoint)
// @access  Public
router.post('/jobseeker/login',
    authRateLimit,
    validateRequest(jobseekerLoginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user || user.userType !== 'jobseeker') {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(400).json({ message: 'Account is deactivated. Please contact support.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id, user.userType);
        const profile = await JobSeeker.findOne({ userId: user._id });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                userType: user.userType,
                emailVerified: user.emailVerified,
                lastLogin: user.lastLogin
            },
            profile: profile ? {
                id: profile._id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
                location: profile.location,
                skills: profile.skills
            } : null
        });
    })
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logout successful' });
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    
    let profile;
    if (user.userType === 'jobseeker') {
        profile = await JobSeeker.findOne({ userId: user._id });
    } else {
        profile = await Company.findOne({ userId: user._id });
    }

    res.json({
        user: {
            id: user._id,
            email: user.email,
            userType: user.userType,
            emailVerified: user.emailVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        },
        profile
    });
}));

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', 
    authenticateToken,
    validateRequest(Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(6).required()
    })),
    asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    })
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password',
    authRateLimit,
    validateRequest(passwordResetSchema),
    asyncHandler(async (req, res) => {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // In production, you would send an actual email here
        // For now, we'll just return a success message
        // TODO: Implement email service (SendGrid, Mailgun, etc.)

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    })
);

// @route   PUT /api/auth/verify-email
// @desc    Verify user email (placeholder)
// @access  Private
router.put('/verify-email', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    user.emailVerified = true;
    await user.save();

    res.json({ message: 'Email verified successfully' });
}));

// @route   DELETE /api/auth/deactivate
// @desc    Deactivate user account
// @access  Private
router.delete('/deactivate', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    user.isActive = false;
    await user.save();

    res.json({ message: 'Account deactivated successfully' });
}));

export default router;
