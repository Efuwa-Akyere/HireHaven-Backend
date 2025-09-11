import * as svc from '../services/jobSeekerService.js';

export const getProfile = async (req, res) => {
    const profile = await svc.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json({ success: true, data: profile });
};

export const updateProfile = async (req, res) => {
    const updated = await svc.updateProfile(req.user.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Profile not found' });
    res.json({ success: true, message: 'Profile updated successfully', data: updated });
};

export const uploadFiles = async (req, res) => {
    const updated = await svc.updateFiles(req.user.id, {
        resumeFile: req.files?.resume?.[0],
        pictureFile: req.files?.profilePicture?.[0]
    });
    if (!updated) return res.status(404).json({ message: 'Profile not found' });
    res.json({
        success: true,
        message: 'Files uploaded successfully',
        data: { resume: updated.resume, profilePicture: updated.profilePicture }
    });
};

export const createExperience = async (req, res) => {
    const list = await svc.addExperience(req.user.id, req.body);
    if (!list) return res.status(404).json({ message: 'Profile not found' });
    res.status(201).json({ success: true, message: 'Experience added successfully', data: list });
};

export const modifyExperience = async (req, res) => {
    const result = await svc.updateExperience(req.user.id, req.params.id, req.body);
    if (result?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (result?.notFound === 'experience') return res.status(404).json({ message: 'Experience not found' });
    res.json({ success: true, message: 'Experience updated successfully', data: result });
};

export const removeExperience = async (req, res) => {
    const ok = await svc.deleteExperience(req.user.id, req.params.id);
    if (ok?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (ok?.notFound === 'experience') return res.status(404).json({ message: 'Experience not found' });
    res.json({ success: true, message: 'Experience deleted successfully' });
};

export const createEducation = async (req, res) => {
    const list = await svc.addEducation(req.user.id, req.body);
    if (!list) return res.status(404).json({ message: 'Profile not found' });
    res.status(201).json({ success: true, message: 'Education added successfully', data: list });
};

export const modifyEducation = async (req, res) => {
    const result = await svc.updateEducation(req.user.id, req.params.id, req.body);
    if (result?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (result?.notFound === 'education') return res.status(404).json({ message: 'Education not found' });
    res.json({ success: true, message: 'Education updated successfully', data: result });
};

export const removeEducation = async (req, res) => {
    const ok = await svc.deleteEducation(req.user.id, req.params.id);
    if (ok?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (ok?.notFound === 'education') return res.status(404).json({ message: 'Education not found' });
    res.json({ success: true, message: 'Education deleted successfully' });
};

export const createCertification = async (req, res) => {
    const list = await svc.addCertification(req.user.id, req.body);
    if (!list) return res.status(404).json({ message: 'Profile not found' });
    res.status(201).json({ success: true, message: 'Certification added successfully', data: list });
};

export const removeCertification = async (req, res) => {
    const ok = await svc.deleteCertification(req.user.id, req.params.id);
    if (ok?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (ok?.notFound === 'certification') return res.status(404).json({ message: 'Certification not found' });
    res.json({ success: true, message: 'Certification deleted successfully' });
};

export const listSavedJobs = async (req, res) => {
    const saved = await svc.getSavedJobs(req.user.id);
    if (!saved) return res.status(404).json({ message: 'Profile not found' });
    res.json({ success: true, data: saved });
};

export const saveJob = async (req, res) => {
    const result = await svc.saveJob(req.user.id, req.params.jobId);
    if (result?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (result?.notFound === 'job') return res.status(404).json({ message: 'Job not found' });
    if (result?.alreadySaved) return res.status(400).json({ message: 'Job already saved' });
    res.status(201).json({ success: true, message: 'Job saved successfully' });
};

export const unsaveJob = async (req, res) => {
    const result = await svc.unsaveJob(req.user.id, req.params.jobId);
    if (result?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (result?.notFound === 'savedJob') return res.status(404).json({ message: 'Saved job not found' });
    res.json({ success: true, message: 'Job unsaved successfully' });
};

export const listApplications = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status } = req.query;
    const result = await svc.getApplicationsPaginated(req.user.id, { page, limit, status });
    if (!result) return res.status(404).json({ message: 'Profile not found' });
    res.json({
        success: true,
        data: result.applications,
        pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) }
    });
};

export const withdraw = async (req, res) => {
    const result = await svc.withdrawApplication(req.user.id, req.params.id);
    if (result?.notFound === 'profile') return res.status(404).json({ message: 'Profile not found' });
    if (result?.notFound === 'application') return res.status(404).json({ message: 'Application not found' });
    if (result?.invalidState) return res.status(400).json({ message: 'Cannot withdraw this application' });
    res.json({ success: true, message: 'Application withdrawn successfully', data: { status: 'withdrawn' } });
};

export const dashboardStats = async (req, res) => {
    const stats = await svc.getDashboardStats(req.user.id);
    if (!stats) return res.status(404).json({ message: 'Profile not found' });
    res.json({ success: true, data: stats });
};