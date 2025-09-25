import { Company, Job, Application, JobSeeker, Analytics, Notification } from '../models/index.js';

// Company Profile Management
export const getCompanyProfile = async (userId) => {
    return await Company.findOne({ userId });
};

export const updateCompanyProfile = async (userId, data) => {
    return await Company.findOneAndUpdate(
        { userId },
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
    );
};

export const uploadCompanyLogo = async (userId, logoFile) => {
    const logoData = {
        filename: logoFile.filename,
        path: logoFile.path,
        uploadDate: new Date()
    };
    
    return await Company.findOneAndUpdate(
        { userId },
        { logo: logoData, updatedAt: new Date() },
        { new: true }
    );
};

// Office Management
export const addOffice = async (userId, officeData) => {
    const company = await Company.findOne({ userId });
    if (!company) return { notFound: 'company' };
    
    company.offices.push(officeData);
    company.updatedAt = new Date();
    await company.save();
    
    return company.offices;
};

export const updateOffice = async (userId, officeId, officeData) => {
    const company = await Company.findOne({ userId });
    if (!company) return { notFound: 'company' };
    
    const office = company.offices.id(officeId);
    if (!office) return { notFound: 'office' };
    
    Object.assign(office, officeData);
    company.updatedAt = new Date();
    await company.save();
    
    return company.offices;
};

export const deleteOffice = async (userId, officeId) => {
    const company = await Company.findOne({ userId });
    if (!company) return { notFound: 'company' };
    
    const office = company.offices.id(officeId);
    if (!office) return { notFound: 'office' };
    
    company.offices.pull(officeId);
    company.updatedAt = new Date();
    await company.save();
    
    return true;
};

// Job Management
export const getCompanyJobs = async (userId, { page = 1, limit = 10, status }) => {
    const company = await Company.findOne({ userId });
    if (!company) return null;
    
    const skip = (page - 1) * limit;
    const filter = { employerId: company._id };
    if (status && ['draft', 'active', 'paused', 'closed'].includes(status)) {
        filter.status = status;
    }
    
    const [jobs, total] = await Promise.all([
        Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Job.countDocuments(filter)
    ]);
    
    return { jobs, total };
};

// Application Management
export const getCompanyApplications = async (userId, { page = 1, limit = 10, status, jobId }) => {
    const company = await Company.findOne({ userId });
    if (!company) return null;
    
    const skip = (page - 1) * limit;
    const filter = { employerId: company._id };
    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;
    
    const [applications, total] = await Promise.all([
        Application.find(filter)
            .populate({ path: 'jobId', select: 'title department' })
            .populate({ path: 'jobSeekerId', select: 'firstName lastName email phone location skills experience education' })
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(limit),
        Application.countDocuments(filter)
    ]);
    
    return { applications, total };
};

export const updateApplicationStatus = async (userId, applicationId, { status, employerNotes, rejectionReason, interviewDetails }) => {
    const company = await Company.findOne({ userId });
    if (!company) return { notFound: 'company' };
    
    const application = await Application.findOne({ _id: applicationId, employerId: company._id })
        .populate('jobSeekerId', 'firstName lastName userId')
        .populate('jobId', 'title');
    
    if (!application) return { notFound: 'application' };
    
    const updateData = { status, lastStatusUpdate: new Date() };
    if (employerNotes) updateData.employerNotes = employerNotes;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (interviewDetails) updateData.interviewDetails = interviewDetails;
    
    await Application.findByIdAndUpdate(applicationId, updateData);
    
    // Create notification for job seeker
    const notification = new Notification({
        userId: application.jobSeekerId.userId,
        type: 'application_status_changed',
        title: 'Application Status Updated',
        message: `Your application for ${application.jobId.title} has been updated to: ${status}`,
        data: { applicationId: application._id, jobId: application.jobId._id, newStatus: status }
    });
    await notification.save();
    
    return true;
};

export const rateCandidate = async (userId, applicationId, { rating, notes }) => {
    const company = await Company.findOne({ userId });
    if (!company) return { notFound: 'company' };
    
    const application = await Application.findOne({ _id: applicationId, employerId: company._id });
    if (!application) return { notFound: 'application' };
    
    application.rating = rating;
    if (notes) application.employerNotes = notes;
    await application.save();
    
    return true;
};

// Dashboard & Analytics
export const getDashboardStats = async (userId) => {
    const company = await Company.findOne({ userId });
    if (!company) return null;
    
    const [totalJobs, activeJobs, totalApplications, interviewsScheduled, hiredThisMonth] = await Promise.all([
        Job.countDocuments({ employerId: company._id }),
        Job.countDocuments({ employerId: company._id, status: 'active' }),
        Application.countDocuments({ employerId: company._id }),
        Application.countDocuments({ employerId: company._id, status: 'interview-scheduled' }),
        Application.countDocuments({ 
            employerId: company._id, 
            status: 'hired', 
            lastStatusUpdate: { $gte: new Date(new Date().setDate(1)) } 
        })
    ]);
    
    const respondedApplications = await Application.countDocuments({ 
        employerId: company._id, 
        status: { $ne: 'applied' } 
    });
    
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
    
    return {
        totalJobs,
        activeJobs,
        totalApplications,
        interviewsScheduled,
        hiredThisMonth,
        responseRate: `${responseRate}%`,
        recentActivity: activityFormatted
    };
};

export const getDetailedAnalytics = async (userId) => {
    const company = await Company.findOne({ userId });
    if (!company) return null;
    
    const jobAnalytics = await Job.aggregate([
        { $match: { employerId: company._id } },
        { $lookup: { from: 'applications', localField: '_id', foreignField: 'jobId', as: 'applications' } },
        { 
            $project: { 
                title: 1, 
                department: 1, 
                status: 1, 
                views: 1, 
                createdAt: 1, 
                applicationsCount: { $size: '$applications' }, 
                hiredCount: { 
                    $size: { 
                        $filter: { 
                            input: '$applications', 
                            cond: { $eq: ['$$this.status', 'hired'] } 
                        } 
                    } 
                } 
            } 
        },
        { $sort: { applicationsCount: -1 } },
        { $limit: 10 }
    ]);
    
    const thirtyDaysAgo = new Date(); 
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const applicationTrends = await Application.aggregate([
        { $match: { employerId: company._id, appliedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" } }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
    ]);
    
    const funnelData = await Application.aggregate([
        { $match: { employerId: company._id } }, 
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    return {
        topPerformingJobs: jobAnalytics,
        applicationTrends,
        hiringFunnel: funnelData,
        metrics: {
            averageTimeToHire: 14,
            applicationSuccessRate: 67,
            interviewShowRate: 89,
            averageCandidateRating: 4.2
        }
    };
};

// Candidate Management
export const getCandidateProfile = async (userId, candidateId) => {
    const company = await Company.findOne({ userId });
    if (!company) return { notFound: 'company' };
    
    const application = await Application.findOne({ 
        jobSeekerId: candidateId, 
        employerId: company._id 
    }).populate('jobId', 'title');
    
    if (!application) return { notFound: 'application' };
    
    const candidate = await JobSeeker.findById(candidateId);
    if (!candidate) return { notFound: 'candidate' };
    
    // Track profile view
    candidate.profileViews += 1;
    await candidate.save();
    
    const analytics = new Analytics({ 
        entityType: 'jobseeker', 
        entityId: candidate._id, 
        eventType: 'view', 
        metadata: { employerId: company._id } 
    });
    await analytics.save();
    
    return {
        candidate,
        application: {
            status: application.status,
            appliedAt: application.appliedAt,
            coverLetter: application.coverLetter,
            rating: application.rating,
            employerNotes: application.employerNotes,
            jobTitle: application.jobId.title
        }
    };
};

// Helper function
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
