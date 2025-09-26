import express from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import { Application, Job, JobSeeker, Company, Notification, Analytics } from '../models/index.js';
import { 
    authenticateToken, 
    requireJobSeeker, 
    validateRequest, 
    asyncHandler 
} from '../middleware/auth.js';

const router = express.Router();

// File upload configuration for application resumes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/applications');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('application/')) {
            cb(null, true);
        } else {
            cb(new Error('Resume must be a PDF file'));
        }
    }
});

// Validation schemas
const applicationSchema = Joi.object({
    coverLetter: Joi.string().max(2000).allow(''),
    customAnswers: Joi.array().items(
        Joi.object({
            question: Joi.string().required(),
            answer: Joi.string().required()
        })
    )
});

// @route   POST /api/applications/apply/:jobId
// @desc    Apply for a job
// @access  Private (Job Seeker)
router.post('/apply/:jobId',
    authenticateToken,
    requireJobSeeker,
    upload.single('resume'),
    validateRequest(applicationSchema),
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const job = await Job.findById(req.params.jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (job.status !== 'active') {
            return res.status(400).json({ message: 'This job is no longer accepting applications' });
        }

        // Check if application deadline has passed
        if (job.applicationDeadline && new Date() > job.applicationDeadline) {
            return res.status(400).json({ message: 'Application deadline has passed' });
        }

        // Check if user has already applied
        const existingApplication = await Application.findOne({
            jobId: req.params.jobId,
            jobSeekerId: jobSeeker._id
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        // Create application
        const applicationData = {
            jobId: req.params.jobId,
            jobSeekerId: jobSeeker._id,
            employerId: job.employerId,
            coverLetter: req.body.coverLetter,
            customAnswers: req.body.customAnswers || []
        };

        // Add resume if uploaded
        if (req.file) {
            applicationData.resume = {
                filename: req.file.filename,
                path: req.file.path,
                uploadDate: new Date()
            };
        }

        const application = new Application(applicationData);
        await application.save();

        // Update job applications count
        await Job.findByIdAndUpdate(req.params.jobId, {
            $inc: { applicationsCount: 1 }
        });

        // Create notification for employer
        const company = await Company.findById(job.employerId);
        if (company) {
            const notification = new Notification({
                userId: company.userId,
                type: 'application_received',
                title: 'New Application Received',
                message: `${jobSeeker.firstName} ${jobSeeker.lastName} applied for ${job.title}`,
                data: {
                    applicationId: application._id,
                    jobId: job._id,
                    jobSeekerId: jobSeeker._id
                }
            });
            await notification.save();
        }

        // Track analytics
        const analytics = new Analytics({
            entityType: 'job',
            entityId: job._id,
            eventType: 'application',
            metadata: { jobSeekerId: jobSeeker._id }
        });
        await analytics.save();

        const populatedApplication = await Application.findById(application._id)
            .populate({
                path: 'jobId',
                select: 'title department location jobType',
                populate: {
                    path: 'employerId',
                    model: 'Company',
                    select: 'companyName logo'
                }
            });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: populatedApplication
        });
    })
);

// @route   GET /api/applications/my-applications
// @desc    Get user's applications
// @access  Private (Job Seeker)
router.get('/my-applications',
    authenticateToken,
    requireJobSeeker,
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const status = req.query.status;

        let filter = { jobSeekerId: jobSeeker._id };
        if (status && ['applied', 'under-review', 'shortlisted', 'interview-scheduled', 'interviewed', 'offered', 'hired', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const applications = await Application.find(filter)
            .populate({
                path: 'jobId',
                select: 'title department location jobType salary',
                populate: {
                    path: 'employerId',
                    model: 'Company',
                    select: 'companyName logo location'
                }
            })
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Application.countDocuments(filter);

        res.json({
            success: true,
            data: applications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    })
);

// @route   GET /api/applications/:id
// @desc    Get single application details
// @access  Private (Job Seeker - own applications only)
router.get('/:id',
    authenticateToken,
    requireJobSeeker,
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const application = await Application.findOne({
            _id: req.params.id,
            jobSeekerId: jobSeeker._id
        })
        .populate({
            path: 'jobId',
            populate: {
                path: 'employerId',
                model: 'Company',
                select: 'companyName logo location website industry description'
            }
        });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json({
            success: true,
            data: application
        });
    })
);

// @route   PUT /api/applications/:id/withdraw
// @desc    Withdraw application
// @access  Private (Job Seeker - own applications only)
router.put('/:id/withdraw',
    authenticateToken,
    requireJobSeeker,
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const application = await Application.findOne({
            _id: req.params.id,
            jobSeekerId: jobSeeker._id
        }).populate('jobId', 'title employerId');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if application can be withdrawn
        if (['hired', 'rejected', 'withdrawn'].includes(application.status)) {
            return res.status(400).json({ message: 'Cannot withdraw this application' });
        }

        // Update application status
        application.status = 'withdrawn';
        application.lastStatusUpdate = new Date();
        await application.save();

        // Update job applications count
        await Job.findByIdAndUpdate(application.jobId._id, {
            $inc: { applicationsCount: -1 }
        });

        // Create notification for employer
        const company = await Company.findById(application.jobId.employerId);
        if (company) {
            const notification = new Notification({
                userId: company.userId,
                type: 'application_status_changed',
                title: 'Application Withdrawn',
                message: `${jobSeeker.firstName} ${jobSeeker.lastName} withdrew their application for ${application.jobId.title}`,
                data: {
                    applicationId: application._id,
                    jobId: application.jobId._id,
                    jobSeekerId: jobSeeker._id
                }
            });
            await notification.save();
        }

        res.json({
            success: true,
            message: 'Application withdrawn successfully',
            data: { status: application.status }
        });
    })
);

// @route   GET /api/applications/stats/overview
// @desc    Get application statistics for job seeker
// @access  Private (Job Seeker)
router.get('/stats/overview',
    authenticateToken,
    requireJobSeeker,
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const [
            totalApplications,
            pendingApplications,
            interviewsScheduled,
            rejectedApplications,
            hiredApplications
        ] = await Promise.all([
            Application.countDocuments({ jobSeekerId: jobSeeker._id }),
            Application.countDocuments({ 
                jobSeekerId: jobSeeker._id, 
                status: { $in: ['applied', 'under-review'] }
            }),
            Application.countDocuments({ 
                jobSeekerId: jobSeeker._id, 
                status: 'interview-scheduled' 
            }),
            Application.countDocuments({ 
                jobSeekerId: jobSeeker._id, 
                status: 'rejected' 
            }),
            Application.countDocuments({ 
                jobSeekerId: jobSeeker._id, 
                status: 'hired' 
            })
        ]);

        // Get application status breakdown
        const statusBreakdown = await Application.aggregate([
            { $match: { jobSeekerId: jobSeeker._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get recent applications
        const recentApplications = await Application.find({ jobSeekerId: jobSeeker._id })
            .populate({
                path: 'jobId',
                select: 'title',
                populate: {
                    path: 'employerId',
                    model: 'Company',
                    select: 'companyName'
                }
            })
            .sort({ appliedAt: -1 })
            .limit(5);

        // Calculate response rate
        const respondedApplications = await Application.countDocuments({
            jobSeekerId: jobSeeker._id,
            status: { $ne: 'applied' }
        });

        const responseRate = totalApplications > 0 
            ? Math.round((respondedApplications / totalApplications) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                overview: {
                    totalApplications,
                    pendingApplications,
                    interviewsScheduled,
                    rejectedApplications,
                    hiredApplications,
                    responseRate: `${responseRate}%`
                },
                statusBreakdown: statusBreakdown.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                recentApplications: recentApplications.map(app => ({
                    id: app._id,
                    jobTitle: app.jobId.title,
                    companyName: app.jobId.employerId.companyName,
                    status: app.status,
                    appliedAt: app.appliedAt
                }))
            }
        });
    })
);

// @route   PUT /api/applications/:id/accept-offer
// @desc    Accept job offer
// @access  Private (Job Seeker)
router.put('/:id/accept-offer',
    authenticateToken,
    requireJobSeeker,
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const application = await Application.findOne({
            _id: req.params.id,
            jobSeekerId: jobSeeker._id,
            status: 'offered'
        }).populate('jobId', 'title employerId');

        if (!application) {
            return res.status(404).json({ message: 'Job offer not found' });
        }

        // Update application status
        application.status = 'hired';
        application.lastStatusUpdate = new Date();
        await application.save();

        // Create notification for employer
        const company = await Company.findById(application.jobId.employerId);
        if (company) {
            const notification = new Notification({
                userId: company.userId,
                type: 'application_status_changed',
                title: 'Job Offer Accepted',
                message: `${jobSeeker.firstName} ${jobSeeker.lastName} accepted the job offer for ${application.jobId.title}`,
                data: {
                    applicationId: application._id,
                    jobId: application.jobId._id,
                    jobSeekerId: jobSeeker._id
                }
            });
            await notification.save();
        }

        res.json({
            success: true,
            message: 'Job offer accepted successfully',
            data: { status: application.status }
        });
    })
);

// @route   PUT /api/applications/:id/decline-offer
// @desc    Decline job offer
// @access  Private (Job Seeker)
router.put('/:id/decline-offer',
    authenticateToken,
    requireJobSeeker,
    validateRequest(Joi.object({
        reason: Joi.string().max(500).allow('')
    })),
    asyncHandler(async (req, res) => {
        const jobSeeker = await JobSeeker.findOne({ userId: req.user.id });
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        const application = await Application.findOne({
            _id: req.params.id,
            jobSeekerId: jobSeeker._id,
            status: 'offered'
        }).populate('jobId', 'title employerId');

        if (!application) {
            return res.status(404).json({ message: 'Job offer not found' });
        }

        // Update application status
        application.status = 'rejected';
        application.rejectionReason = req.body.reason;
        application.lastStatusUpdate = new Date();
        await application.save();

        // Create notification for employer
        const company = await Company.findById(application.jobId.employerId);
        if (company) {
            const notification = new Notification({
                userId: company.userId,
                type: 'application_status_changed',
                title: 'Job Offer Declined',
                message: `${jobSeeker.firstName} ${jobSeeker.lastName} declined the job offer for ${application.jobId.title}`,
                data: {
                    applicationId: application._id,
                    jobId: application.jobId._id,
                    jobSeekerId: jobSeeker._id,
                    reason: req.body.reason
                }
            });
            await notification.save();
        }

        res.json({
            success: true,
            message: 'Job offer declined',
            data: { status: application.status }
        });
    })
);

export default router;
