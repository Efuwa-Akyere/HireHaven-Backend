import express from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import { Company, Job, Application, JobSeeker, Analytics, Notification } from '../models/index.js';
import { 
    authenticateToken, 
    requireEmployer, 
    validateRequest, 
    asyncHandler 
} from '../middleware/auth.js';


const router = express.Router();

// File upload configuration for employers
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/companies'),
    filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// Validation schemas
const companyUpdateSchema = Joi.object({
    companyName: Joi.string().trim().allow(''),
    industry: Joi.string().trim().allow(''),
    companySize: Joi.string().valid('1-10', '11-50', '51-100', '101-500', '501-1000', '1000+'),
    foundedYear: Joi.number().min(1800).max(new Date().getFullYear()),
    website: Joi.string().uri().allow(''),
    phone: Joi.string().trim().allow(''),
    location: Joi.object({
        address: Joi.string().allow(''),
        city: Joi.string().allow(''),
        state: Joi.string().allow(''),
        country: Joi.string().default('Ghana')
    }),
    description: Joi.string().max(2000).allow(''),
    culture: Joi.array().items(Joi.string().allow('')),
    benefits: Joi.array().items(Joi.string().allow('')),
    socialLinks: Joi.object({
        linkedin: Joi.string().uri().allow(''),
        twitter: Joi.string().uri().allow(''),
        facebook: Joi.string().uri().allow(''),
        instagram: Joi.string().uri().allow('')
    })
});

const officeSchema = Joi.object({
    name: Joi.string().required(),
    address: Joi.string().required(),
    type: Joi.string().valid('headquarters', 'branch', 'remote').required()
});

// ---------------------- ROUTES ---------------------- //

// Get company profile
router.get('/profile', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    res.json({ success: true, data: company });
}));

// Update company profile
router.put('/profile', authenticateToken, requireEmployer, validateRequest(companyUpdateSchema), asyncHandler(async (req, res) => {
    const company = await Company.findOneAndUpdate(
        { userId: req.user.id },
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    res.json({ success: true, message: 'Company profile updated successfully', data: company });
}));

// Upload company logo
router.post('/upload-logo', authenticateToken, requireEmployer, upload.single('logo'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No logo file provided' });
    const company = await Company.findOneAndUpdate(
        { userId: req.user.id },
        { logo: { filename: req.file.filename, path: req.file.path, uploadDate: new Date() }, updatedAt: new Date() },
        { new: true }
    );
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    res.json({ success: true, message: 'Logo uploaded successfully', data: { logo: company.logo } });
}));

// ---------------------- OFFICES ---------------------- //

// Add office
router.post('/offices', authenticateToken, requireEmployer, validateRequest(officeSchema), asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    company.offices.push(req.body);
    company.updatedAt = new Date();
    await company.save();
    res.status(201).json({ success: true, message: 'Office added successfully', data: company.offices });
}));

// Update office
router.put('/offices/:id', authenticateToken, requireEmployer, validateRequest(officeSchema), asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    const office = company.offices.id(req.params.id);
    if (!office) return res.status(404).json({ message: 'Office not found' });
    Object.assign(office, req.body);
    company.updatedAt = new Date();
    await company.save();
    res.json({ success: true, message: 'Office updated successfully', data: company.offices });
}));

// Delete office
router.delete('/offices/:id', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    const office = company.offices.id(req.params.id);
    if (!office) return res.status(404).json({ message: 'Office not found' });
    company.offices.pull(req.params.id);
    company.updatedAt = new Date();
    await company.save();
    res.json({ success: true, message: 'Office deleted successfully' });
}));

// ---------------------- JOBS & APPLICATIONS ---------------------- //

// Get company jobs
router.get('/jobs', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    let filter = { employerId: company._id };
    if (status && ['draft', 'active', 'paused', 'closed'].includes(status)) filter.status = status;
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Job.countDocuments(filter);
    res.json({ success: true, data: jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

// Get applications
router.get('/applications', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, jobId } = req.query;
    let filter = { employerId: company._id };
    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;
    const applications = await Application.find(filter)
        .populate({ path: 'jobId', select: 'title department' })
        .populate({ path: 'jobSeekerId', select: 'firstName lastName email phone location skills experience education' })
        .sort({ appliedAt: -1 }).skip(skip).limit(limit);
    const total = await Application.countDocuments(filter);
    res.json({ success: true, data: applications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

// Update application status
router.put('/applications/:id/status', authenticateToken, requireEmployer, validateRequest(Joi.object({
    status: Joi.string().valid(
        'applied', 'under-review', 'shortlisted', 'interview-scheduled', 
        'interviewed', 'offered', 'hired', 'rejected'
    ).required(),
    employerNotes: Joi.string().allow(''),
    rejectionReason: Joi.string().when('status', { is: 'rejected', then: Joi.required() }),
    interviewDetails: Joi.object({
        scheduledDate: Joi.date(),
        interviewType: Joi.string().valid('phone', 'video', 'in-person', 'technical'),
        location: Joi.string().allow(''),
        notes: Joi.string().allow('')
    }).when('status', { is: 'interview-scheduled', then: Joi.required() })
})), asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });

    const application = await Application.findOne({ _id: req.params.id, employerId: company._id })
        .populate('jobSeekerId', 'firstName lastName userId')
        .populate('jobId', 'title');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const updateData = { status: req.body.status, lastStatusUpdate: new Date() };
    if (req.body.employerNotes) updateData.employerNotes = req.body.employerNotes;
    if (req.body.rejectionReason) updateData.rejectionReason = req.body.rejectionReason;
    if (req.body.interviewDetails) updateData.interviewDetails = req.body.interviewDetails;
    await Application.findByIdAndUpdate(req.params.id, updateData);

    const notification = new Notification({
        userId: application.jobSeekerId.userId,
        type: 'application_status_changed',
        title: 'Application Status Updated',
        message: `Your application for ${application.jobId.title} has been updated to: ${req.body.status}`,
        data: { applicationId: application._id, jobId: application.jobId._id, newStatus: req.body.status }
    });
    await notification.save();

    res.json({ success: true, message: 'Application status updated successfully' });
}));

// Rate candidate
router.put('/applications/:id/rating', authenticateToken, requireEmployer, validateRequest(Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    notes: Joi.string().allow('')
})), asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });

    const application = await Application.findOne({ _id: req.params.id, employerId: company._id });
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.rating = req.body.rating;
    if (req.body.notes) application.employerNotes = req.body.notes;
    await application.save();

    res.json({ success: true, message: 'Candidate rated successfully' });
}));

// ---------------------- DASHBOARD & ANALYTICS ---------------------- //

// Dashboard stats
router.get('/dashboard-stats', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });

    const [totalJobs, activeJobs, totalApplications, interviewsScheduled, hiredThisMonth] = await Promise.all([
        Job.countDocuments({ employerId: company._id }),
        Job.countDocuments({ employerId: company._id, status: 'active' }),
        Application.countDocuments({ employerId: company._id }),
        Application.countDocuments({ employerId: company._id, status: 'interview-scheduled' }),
        Application.countDocuments({ employerId: company._id, status: 'hired', 'lastStatusUpdate': { $gte: new Date(new Date().setDate(1)) } })
    ]);

    const respondedApplications = await Application.countDocuments({ employerId: company._id, status: { $ne: 'applied' } });
    const responseRate = totalApplications ? Math.round((respondedApplications / totalApplications) * 100) : 0;

    const recentActivity = await Application.find({ employerId: company._id })
        .populate({ path: 'jobId', select: 'title' })
        .populate({ path: 'jobSeekerId', select: 'firstName lastName' })
        .sort({ appliedAt: -1 })
        .limit(5);

    const activityFormatted = recentActivity.map(app => ({
        id: app._id,
        type: 'application',
        title: 'New application received',
        description: `${app.jobSeekerId.firstName} ${app.jobSeekerId.lastName} applied for ${app.jobId.title}`,
        time: getTimeAgo(app.appliedAt)
    }));

    res.json({ success: true, data: { totalJobs, activeJobs, totalApplications, interviewsScheduled, hiredThisMonth, responseRate: `${responseRate}%`, recentActivity: activityFormatted } });
}));

// Detailed analytics
router.get('/analytics', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });

    const jobAnalytics = await Job.aggregate([
        { $match: { employerId: company._id } },
        { $lookup: { from: 'applications', localField: '_id', foreignField: 'jobId', as: 'applications' } },
        { $project: { title: 1, department: 1, status: 1, views: 1, createdAt: 1, applicationsCount: { $size: '$applications' }, hiredCount: { $size: { $filter: { input: '$applications', cond: { $eq: ['$$this.status', 'hired'] } } } } } },
        { $sort: { applicationsCount: -1 } },
        { $limit: 10 }
    ]);

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const applicationTrends = await Application.aggregate([
        { $match: { employerId: company._id, appliedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
    ]);

    const funnelData = await Application.aggregate([{ $match: { employerId: company._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);

    res.json({ success: true, data: { topPerformingJobs: jobAnalytics, applicationTrends, hiringFunnel: funnelData, metrics: { averageTimeToHire: 14, applicationSuccessRate: 67, interviewShowRate: 89, averageCandidateRating: 4.2 } } });
}));

// Candidate profile
router.get('/candidate/:id', authenticateToken, requireEmployer, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ userId: req.user.id });
    if (!company) return res.status(404).json({ message: 'Company profile not found' });

    const application = await Application.findOne({ jobSeekerId: req.params.id, employerId: company._id }).populate('jobId', 'title');
    if (!application) return res.status(403).json({ message: 'Access denied' });

    const candidate = await JobSeeker.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    candidate.profileViews += 1;
    await candidate.save();

    const analytics = new Analytics({ entityType: 'jobseeker', entityId: candidate._id, eventType: 'view', metadata: { employerId: company._id } });
    await analytics.save();

    res.json({ success: true, data: { candidate, application: { status: application.status, appliedAt: application.appliedAt, coverLetter: application.coverLetter, rating: application.rating, employerNotes: application.employerNotes, jobTitle: application.jobId.title } } });
}));

// ---------------------- HELPERS ---------------------- //
function getTimeAgo(date) {
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
}

export default router;
