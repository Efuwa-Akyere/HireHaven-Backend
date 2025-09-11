import express from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import { authenticateToken, requireJobSeeker, validateRequest, asyncHandler } from '../middleware/auth.js';
import * as ctrl from '../controller/jobSeekerController.js';

const router = express.Router();

// Upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = file.fieldname === 'resume' ? 'uploads/resumes' : 'uploads/profiles';
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'resume') {
            if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('application/')) cb(null, true);
            else cb(new Error('Resume must be a PDF file'));
        } else if (file.fieldname === 'profilePicture') {
            if (file.mimetype.startsWith('image/')) cb(null, true);
            else cb(new Error('Profile picture must be an image file'));
        } else {
            cb(new Error('Unknown field'));
        }
    }
});

// Schemas
const profileUpdateSchema = Joi.object({
    firstName: Joi.string().trim(),
    lastName: Joi.string().trim(),
    phone: Joi.string().trim(),
    location: Joi.string().trim(),
    skills: Joi.array().items(Joi.string().trim()),
    bio: Joi.string().max(1000),
    socialLinks: Joi.object({
        linkedin: Joi.string().uri().allow(''),
        github: Joi.string().uri().allow(''),
        portfolio: Joi.string().uri().allow(''),
        twitter: Joi.string().uri().allow('')
    }),
    preferences: Joi.object({
        jobTypes: Joi.array().items(Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'remote')),
        salaryRange: Joi.object({
            min: Joi.number().min(0),
            max: Joi.number().min(0),
            currency: Joi.string().default('GHS')
        }),
        preferredLocations: Joi.array().items(Joi.string()),
        availability: Joi.string().valid('immediate', '2-weeks', '1-month', 'negotiable')
    })
});
const experienceSchema = Joi.object({
    position: Joi.string().required(),
    company: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    isCurrentJob: Joi.boolean(),
    description: Joi.string().max(1000)
});
const educationSchema = Joi.object({
    degree: Joi.string().required(),
    institution: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date(),
    isCurrentStudy: Joi.boolean(),
    gpa: Joi.string()
});
const certificationSchema = Joi.object({
    name: Joi.string().required(),
    issuer: Joi.string(),
    issueDate: Joi.date(),
    expiryDate: Joi.date(),
    credentialId: Joi.string()
});

// Routes
router.get('/profile', authenticateToken, requireJobSeeker, asyncHandler(ctrl.getProfile));
router.put('/profile', authenticateToken, requireJobSeeker, validateRequest(profileUpdateSchema), asyncHandler(ctrl.updateProfile));
router.post('/upload',
    authenticateToken,
    requireJobSeeker,
    upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'profilePicture', maxCount: 1 }]),
    asyncHandler(ctrl.uploadFiles)
);

router.post('/experience', authenticateToken, requireJobSeeker, validateRequest(experienceSchema), asyncHandler(ctrl.createExperience));
router.put('/experience/:id', authenticateToken, requireJobSeeker, validateRequest(experienceSchema), asyncHandler(ctrl.modifyExperience));
router.delete('/experience/:id', authenticateToken, requireJobSeeker, asyncHandler(ctrl.removeExperience));

router.post('/education', authenticateToken, requireJobSeeker, validateRequest(educationSchema), asyncHandler(ctrl.createEducation));
router.put('/education/:id', authenticateToken, requireJobSeeker, validateRequest(educationSchema), asyncHandler(ctrl.modifyEducation));
router.delete('/education/:id', authenticateToken, requireJobSeeker, asyncHandler(ctrl.removeEducation));

router.post('/certifications', authenticateToken, requireJobSeeker, validateRequest(certificationSchema), asyncHandler(ctrl.createCertification));
router.delete('/certifications/:id', authenticateToken, requireJobSeeker, asyncHandler(ctrl.removeCertification));

router.get('/saved-jobs', authenticateToken, requireJobSeeker, asyncHandler(ctrl.listSavedJobs));
router.post('/save-job/:jobId', authenticateToken, requireJobSeeker, asyncHandler(ctrl.saveJob));
router.delete('/unsave-job/:jobId', authenticateToken, requireJobSeeker, asyncHandler(ctrl.unsaveJob));

router.get('/applications', authenticateToken, requireJobSeeker, asyncHandler(ctrl.listApplications));
router.put('/applications/:id/withdraw', authenticateToken, requireJobSeeker, asyncHandler(ctrl.withdraw));

router.get('/dashboard-stats', authenticateToken, requireJobSeeker, asyncHandler(ctrl.dashboardStats));

export default router;