import Employer from '../models/employer.js';
import * as svc from '../services/employerService.js';

// Company Profile Management
export const getProfile = async (req, res) => {
    const company = await svc.getCompanyProfile(req.user.id);
    if (!company) return res.status(404).json({ message: 'Company profile not found' });
    res.json({ success: true, data: company });
};

export const updateProfile = async (req, res) => {
    const updated = await svc.updateCompanyProfile(req.user.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Company profile not found' });
    res.json({ success: true, message: 'Company profile updated successfully', data: updated });
};

export const uploadLogo = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No logo file provided' });
    
    const updated = await svc.uploadCompanyLogo(req.user.id, req.file);
    if (!updated) return res.status(404).json({ message: 'Company profile not found' });
    
    res.json({ 
        success: true, 
        message: 'Logo uploaded successfully', 
        data: { logo: updated.logo } 
    });
};

// Office Management
export const addOffice = async (req, res) => {
    const result = await svc.addOffice(req.user.id, req.body);
    if (result?.notFound === 'company') return res.status(404).json({ message: 'Company profile not found' });
    
    res.status(201).json({ 
        success: true, 
        message: 'Office added successfully', 
        data: result 
    });
};

export const updateOffice = async (req, res) => {
    const result = await svc.updateOffice(req.user.id, req.params.id, req.body);
    if (result?.notFound === 'company') return res.status(404).json({ message: 'Company profile not found' });
    if (result?.notFound === 'office') return res.status(404).json({ message: 'Office not found' });
    
    res.json({ 
        success: true, 
        message: 'Office updated successfully', 
        data: result 
    });
};

export const deleteOffice = async (req, res) => {
    const result = await svc.deleteOffice(req.user.id, req.params.id);
    if (result?.notFound === 'company') return res.status(404).json({ message: 'Company profile not found' });
    if (result?.notFound === 'office') return res.status(404).json({ message: 'Office not found' });
    
    res.json({ success: true, message: 'Office deleted successfully' });
};

// Job Management
export const getJobs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status } = req.query;
    
    const result = await svc.getCompanyJobs(req.user.id, { page, limit, status });
    if (!result) return res.status(404).json({ message: 'Company profile not found' });
    
    res.json({ 
        success: true, 
        data: result.jobs, 
        pagination: { 
            page, 
            limit, 
            total: result.total, 
            pages: Math.ceil(result.total / limit) 
        } 
    });
};

// Application Management
export const getApplications = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status, jobId } = req.query;
    
    const result = await svc.getCompanyApplications(req.user.id, { page, limit, status, jobId });
    if (!result) return res.status(404).json({ message: 'Company profile not found' });
    
    res.json({ 
        success: true, 
        data: result.applications, 
        pagination: { 
            page, 
            limit, 
            total: result.total, 
            pages: Math.ceil(result.total / limit) 
        } 
    });
};

export const updateApplicationStatus = async (req, res) => {
    const result = await svc.updateApplicationStatus(req.user.id, req.params.id, req.body);
    if (result?.notFound === 'company') return res.status(404).json({ message: 'Company profile not found' });
    if (result?.notFound === 'application') return res.status(404).json({ message: 'Application not found' });
    
    res.json({ success: true, message: 'Application status updated successfully' });
};

export const rateCandidate = async (req, res) => {
    const result = await svc.rateCandidate(req.user.id, req.params.id, req.body);
    if (result?.notFound === 'company') return res.status(404).json({ message: 'Company profile not found' });
    if (result?.notFound === 'application') return res.status(404).json({ message: 'Application not found' });
    
    res.json({ success: true, message: 'Candidate rated successfully' });
};

// Dashboard & Analytics
export const getDashboardStats = async (req, res) => {
    const stats = await svc.getDashboardStats(req.user.id);
    if (!stats) return res.status(404).json({ message: 'Company profile not found' });
    
    res.json({ success: true, data: stats });
};

export const getAnalytics = async (req, res) => {
    const analytics = await svc.getDetailedAnalytics(req.user.id);
    if (!analytics) return res.status(404).json({ message: 'Company profile not found' });
    
    res.json({ success: true, data: analytics });
};

// Candidate Management
export const getCandidateProfile = async (req, res) => {
    const result = await svc.getCandidateProfile(req.user.id, req.params.id);
    if (result?.notFound === 'company') return res.status(404).json({ message: 'Company profile not found' });
    if (result?.notFound === 'application') return res.status(403).json({ message: 'Access denied' });
    if (result?.notFound === 'candidate') return res.status(404).json({ message: 'Candidate not found' });
    
    res.json({ success: true, data: result });
};

// export default Employer