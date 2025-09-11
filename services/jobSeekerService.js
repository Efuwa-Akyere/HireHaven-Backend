import { JobSeeker, SavedJob, Application, Job, Company, Analytics, Notification } from '../models/index.js';

export const getProfile = async (userId) => {
    return await JobSeeker.findOne({ userId });
};

export const updateProfile = async (userId, data) => {
    return await JobSeeker.findOneAndUpdate(
        { userId },
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
    );
};

export const updateFiles = async (userId, { resumeFile, pictureFile }) => {
    const updateData = {};
    if (resumeFile) {
        updateData.resume = {
            filename: resumeFile.filename,
            path: resumeFile.path,
            uploadDate: new Date()
        };
    }
    if (pictureFile) {
        updateData.profilePicture = {
            filename: pictureFile.filename,
            path: pictureFile.path,
            uploadDate: new Date()
        };
    }
    return await JobSeeker.findOneAndUpdate(
        { userId },
        { ...updateData, updatedAt: new Date() },
        { new: true }
    );
};

export const addExperience = async (userId, payload) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return null;
    profile.experience.push(payload);
    profile.updatedAt = new Date();
    await profile.save();
    return profile.experience;
};

export const updateExperience = async (userId, expId, payload) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const exp = profile.experience.id(expId);
    if (!exp) return { notFound: 'experience' };
    Object.assign(exp, payload);
    profile.updatedAt = new Date();
    await profile.save();
    return profile.experience;
};

export const deleteExperience = async (userId, expId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const exp = profile.experience.id(expId);
    if (!exp) return { notFound: 'experience' };
    profile.experience.pull(expId);
    profile.updatedAt = new Date();
    await profile.save();
    return true;
};

export const addEducation = async (userId, payload) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return null;
    profile.education.push(payload);
    profile.updatedAt = new Date();
    await profile.save();
    return profile.education;
};

export const updateEducation = async (userId, eduId, payload) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const edu = profile.education.id(eduId);
    if (!edu) return { notFound: 'education' };
    Object.assign(edu, payload);
    profile.updatedAt = new Date();
    await profile.save();
    return profile.education;
};

export const deleteEducation = async (userId, eduId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const edu = profile.education.id(eduId);
    if (!edu) return { notFound: 'education' };
    profile.education.pull(eduId);
    profile.updatedAt = new Date();
    await profile.save();
    return true;
};

export const addCertification = async (userId, payload) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return null;
    profile.certifications.push(payload);
    profile.updatedAt = new Date();
    await profile.save();
    return profile.certifications;
};

export const deleteCertification = async (userId, certId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const cert = profile.certifications.id(certId);
    if (!cert) return { notFound: 'certification' };
    profile.certifications.pull(certId);
    profile.updatedAt = new Date();
    await profile.save();
    return true;
};

export const getSavedJobs = async (userId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return null;
    const saved = await SavedJob.find({ jobSeekerId: profile._id })
        .populate({
            path: 'jobId',
            populate: { path: 'employerId', model: 'Company', select: 'companyName logo location' }
        })
        .sort({ savedAt: -1 });
    return saved;
};

export const saveJob = async (userId, jobId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const job = await Job.findById(jobId);
    if (!job) return { notFound: 'job' };

    const exists = await SavedJob.findOne({ jobSeekerId: profile._id, jobId });
    if (exists) return { alreadySaved: true };

    const saved = new SavedJob({ jobSeekerId: profile._id, jobId });
    await saved.save();

    const analytics = new Analytics({
        entityType: 'job',
        entityId: jobId,
        eventType: 'save',
        metadata: { jobSeekerId: profile._id }
    });
    await analytics.save();

    return true;
};

export const unsaveJob = async (userId, jobId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };
    const deleted = await SavedJob.findOneAndDelete({ jobSeekerId: profile._id, jobId });
    if (!deleted) return { notFound: 'savedJob' };
    return true;
};

export const getApplicationsPaginated = async (userId, { page = 1, limit = 10, status }) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return null;

    const skip = (page - 1) * limit;
    const filter = { jobSeekerId: profile._id };
    if (status) filter.status = status;

    const [applications, total] = await Promise.all([
        Application.find(filter)
            .populate({
                path: 'jobId',
                select: 'title department location jobType salary',
                populate: { path: 'employerId', model: 'Company', select: 'companyName logo location' }
            })
            .sort({ appliedAt: -1 })
            .skip(skip)
            .limit(limit),
        Application.countDocuments(filter)
    ]);

    return { applications, total };
};

export const withdrawApplication = async (userId, applicationId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return { notFound: 'profile' };

    const application = await Application.findOne({ _id: applicationId, jobSeekerId: profile._id })
        .populate('jobId', 'title employerId');
    if (!application) return { notFound: 'application' };

    if (['hired', 'rejected', 'withdrawn'].includes(application.status)) {
        return { invalidState: true };
    }

    application.status = 'withdrawn';
    application.lastStatusUpdate = new Date();
    await application.save();

    await Job.findByIdAndUpdate(application.jobId._id, { $inc: { applicationsCount: -1 } });

    const company = await Company.findById(application.jobId.employerId);
    if (company) {
        const notification = new Notification({
            userId: company.userId,
            type: 'application_status_changed',
            title: 'Application Withdrawn',
            message: `Your candidate withdrew application for ${application.jobId.title}`,
            data: { applicationId: application._id, jobId: application.jobId._id, jobSeekerId: profile._id }
        });
        await notification.save();
    }

    return true;
};

export const getDashboardStats = async (userId) => {
    const profile = await JobSeeker.findOne({ userId });
    if (!profile) return null;

    const [
        totalApplications,
        savedJobs,
        interviewsScheduled
    ] = await Promise.all([
        Application.countDocuments({ jobSeekerId: profile._id }),
        SavedJob.countDocuments({ jobSeekerId: profile._id }),
        Application.countDocuments({ jobSeekerId: profile._id, status: 'interview-scheduled' })
    ]);

    const respondedApplications = await Application.countDocuments({
        jobSeekerId: profile._id,
        status: { $ne: 'applied' }
    });

    const recentApplications = await Application.find({ jobSeekerId: profile._id })
        .populate({
            path: 'jobId',
            populate: { path: 'employerId', model: 'Company', select: 'companyName' }
        })
        .sort({ appliedAt: -1 })
        .limit(3);

    const responseRate = totalApplications > 0 ? Math.round((respondedApplications / totalApplications) * 100) : 0;

    return {
        totalApplications,
        savedJobs,
        interviewsScheduled,
        profileViews: profile.profileViews,
        responseRate: `${responseRate}%`,
        recentApplications
    };
};