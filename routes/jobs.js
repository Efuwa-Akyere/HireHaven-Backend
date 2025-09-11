import express from 'express';
import Joi from 'joi';
import { Job, Company, Analytics, SavedJob, Application } from '../models/index.js';
import { 
    authenticateToken, 
    requireEmployer, 
    optionalAuth,
    validateRequest, 
    asyncHandler 
} from '../middleware/auth.js';

const router = express.Router();


// Validation schemas
const jobSchema = Joi.object({
    title: Joi.string().required().trim(),
    department: Joi.string().required().trim(),
    description: Joi.string().required().max(5000),
    requirements: Joi.array().items(Joi.string()),
    responsibilities: Joi.array().items(Joi.string()),
    location: Joi.string().required(),
    jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'remote').required(),
    experienceLevel: Joi.string().valid('entry', 'junior', 'mid', 'senior', 'executive').required(),
    salary: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0),
        currency: Joi.string().default('GHS'),
        negotiable: Joi.boolean().default(false)
    }),
    skills: Joi.array().items(Joi.string()),
    benefits: Joi.array().items(Joi.string()),
    applicationDeadline: Joi.date().greater('now'),
    urgentHiring: Joi.boolean().default(false)
});

const jobUpdateSchema = jobSchema.keys({
    status: Joi.string().valid('draft', 'active', 'paused', 'closed')
});

// @route   GET /api/jobs
// @desc    Get all jobs (public with optional auth for personalization)
// @access  Public
router.get('/', 
    optionalAuth,
    asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { status: 'active' };
        
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { skills: { $in: [searchRegex] } },
                { department: searchRegex }
            ];
        }

        if (req.query.location) {
            filter.location = new RegExp(req.query.location, 'i');
        }

        if (req.query.jobType) {
            filter.jobType = req.query.jobType;
        }

        if (req.query.experienceLevel) {
            filter.experienceLevel = req.query.experienceLevel;
        }

        if (req.query.department) {
            filter.department = new RegExp(req.query.department, 'i');
        }

        // Salary range filter
        if (req.query.salaryMin || req.query.salaryMax) {
            filter.$and = [];
            if (req.query.salaryMin) {
                filter.$and.push({ 'salary.max': { $gte: parseInt(req.query.salaryMin) } });
            }
            if (req.query.salaryMax) {
                filter.$and.push({ 'salary.min': { $lte: parseInt(req.query.salaryMax) } });
            }
        }

        // Build sort
        let sort = { createdAt: -1 }; // Default: newest first
        
        if (req.query.sortBy === 'salary-desc') {
            sort = { 'salary.max': -1 };
        } else if (req.query.sortBy === 'salary-asc') {
            sort = { 'salary.min': 1 };
        } else if (req.query.sortBy === 'views') {
            sort = { views: -1 };
        } else if (req.query.sortBy === 'applications') {
            sort = { applicationsCount: -1 };
        }

        const jobs = await Job.find(filter)
            .populate({
                path: 'employerId',
                select: 'companyName logo location industry companySize'
            })
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Job.countDocuments(filter);

        // If user is authenticated, get their saved jobs
        let savedJobIds = [];
        if (req.user && req.user.userType === 'jobseeker') {
            const savedJobs = await SavedJob.find({ 
                jobSeekerId: req.user.profileId 
            }).select('jobId');
            savedJobIds = savedJobs.map(saved => saved.jobId.toString());
        }

        // Add saved status to jobs
        const jobsWithSavedStatus = jobs.map(job => ({
            ...job.toObject(),
            isSaved: savedJobIds.includes(job._id.toString())
        }));

        res.json({
            success: true,
            data: jobsWithSavedStatus,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                search: req.query.search,
                location: req.query.location,
                jobType: req.query.jobType,
                experienceLevel: req.query.experienceLevel,
                department: req.query.department,
                salaryMin: req.query.salaryMin,
                salaryMax: req.query.salaryMax,
                sortBy: req.query.sortBy
            }
        });
    })
);

// @route   GET /api/jobs/featured
// @desc    Get featured jobs
// @access  Public
router.get('/featured',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const jobs = await Job.find({ 
            status: 'active', 
            featured: true 
        })
            .populate({
                path: 'employerId',
                select: 'companyName logo location'
            })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: jobs
        });
    })
);

// @route   GET /api/jobs/recommendations
// @desc    Get job recommendations for authenticated user
// @access  Private (Job Seeker)
router.get('/recommendations',
    authenticateToken,
    asyncHandler(async (req, res) => {
        if (req.user.userType !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can get recommendations' });
        }

        // This is a simplified recommendation system
        // In production, you'd use more sophisticated algorithms
        const jobs = await Job.find({ status: 'active' })
            .populate({
                path: 'employerId',
                select: 'companyName logo location'
            })
            .sort({ views: -1, createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            data: jobs
        });
    })
);

// @route   GET /api/jobs/:id
// @desc    Get single job
// @access  Public (with optional auth)
router.get('/:id',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const job = await Job.findById(req.params.id)
            .populate({
                path: 'employerId',
                select: 'companyName logo location industry description website companySize foundedYear'
            });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Increment view count
        job.views += 1;
        await job.save();

        // Track analytics
        const analytics = new Analytics({
            entityType: 'job',
            entityId: job._id,
            eventType: 'view',
            metadata: req.user ? { userId: req.user.id } : null
        });
        await analytics.save();

        // Check if user has saved this job
        let isSaved = false;
        let hasApplied = false;
        
        if (req.user && req.user.userType === 'jobseeker') {
            const savedJob = await SavedJob.findOne({ 
                jobSeekerId: req.user.profileId,
                jobId: job._id 
            });
            isSaved = !!savedJob;

            const application = await Application.findOne({
                jobSeekerId: req.user.profileId,
                jobId: job._id
            });
            hasApplied = !!application;
        }

        // Get related jobs
        const relatedJobs = await Job.find({
            _id: { $ne: job._id },
            $or: [
                { department: job.department },
                { skills: { $in: job.skills } },
                { employerId: job.employerId }
            ],
            status: 'active'
        })
        .populate({
            path: 'employerId',
            select: 'companyName logo location'
        })
        .limit(6);

        res.json({
            success: true,
            data: {
                ...job.toObject(),
                isSaved,
                hasApplied,
                relatedJobs
            }
        });
    })
);

// @route   POST /api/jobs
// @desc    Create new job posting
// @access  Private (Employer)
router.post('/',
    authenticateToken,
    requireEmployer,
    validateRequest(jobSchema),
    asyncHandler(async (req, res) => {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        const job = new Job({
            ...req.body,
            employerId: company._id
        });

        await job.save();

        const populatedJob = await Job.findById(job._id)
            .populate({
                path: 'employerId',
                select: 'companyName logo location'
            });

        res.status(201).json({
            success: true,
            message: 'Job posted successfully',
            data: populatedJob
        });
    })
);

// @route   PUT /api/jobs/:id
// @desc    Update job posting
// @access  Private (Employer - own jobs only)
router.put('/:id',
    authenticateToken,
    requireEmployer,
    validateRequest(jobUpdateSchema),
    asyncHandler(async (req, res) => {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        const job = await Job.findOne({ 
            _id: req.params.id, 
            employerId: company._id 
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found or access denied' });
        }

        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate({
            path: 'employerId',
            select: 'companyName logo location'
        });

        res.json({
            success: true,
            message: 'Job updated successfully',
            data: updatedJob
        });
    })
);

// @route   DELETE /api/jobs/:id
// @desc    Delete job posting
// @access  Private (Employer - own jobs only)
router.delete('/:id',
    authenticateToken,
    requireEmployer,
    asyncHandler(async (req, res) => {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        const job = await Job.findOne({ 
            _id: req.params.id, 
            employerId: company._id 
        });

        if (!job) {
            return res.status(404).json({ message: 'Job not found or access denied' });
        }

        await Job.findByIdAndDelete(req.params.id);
        
        // Also delete related applications and saved jobs
        await Application.deleteMany({ jobId: req.params.id });
        await SavedJob.deleteMany({ jobId: req.params.id });

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    })
);

// @route   PUT /api/jobs/:id/status
// @desc    Update job status (active/paused/closed)
// @access  Private (Employer - own jobs only)
router.put('/:id/status',
    authenticateToken,
    requireEmployer,
    validateRequest(Joi.object({
        status: Joi.string().valid('active', 'paused', 'closed').required()
    })),
    asyncHandler(async (req, res) => {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        const job = await Job.findOneAndUpdate(
            { _id: req.params.id, employerId: company._id },
            { status: req.body.status, updatedAt: new Date() },
            { new: true }
        );

        if (!job) {
            return res.status(404).json({ message: 'Job not found or access denied' });
        }

        res.json({
            success: true,
            message: `Job ${req.body.status} successfully`,
            data: { status: job.status }
        });
    })
);

// @route   GET /api/jobs/stats/overview
// @desc    Get job market overview stats
// @access  Public
router.get('/stats/overview',
    asyncHandler(async (req, res) => {
        const [
            totalJobs,
            activeJobs,
            totalApplications,
            companiesHiring
        ] = await Promise.all([
            Job.countDocuments(),
            Job.countDocuments({ status: 'active' }),
            Application.countDocuments(),
            Company.distinct('_id', { 
                _id: { $in: await Job.distinct('employerId', { status: 'active' }) }
            }).then(ids => ids.length)
        ]);

        // Get popular job categories
        const popularCategories = await Job.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get popular locations
        const popularLocations = await Job.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$location', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalJobs,
                    activeJobs,
                    totalApplications,
                    companiesHiring
                },
                popularCategories: popularCategories.map(cat => ({
                    name: cat._id,
                    count: cat.count
                })),
                popularLocations: popularLocations.map(loc => ({
                    name: loc._id,
                    count: loc.count
                }))
            }
        });
    })
);

export default router;
