import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema (Base schema for both job seekers and employers)
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    userType: {
        type: String,
        enum: ['jobseeker', 'employer'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Job Seeker Profile Schema
const jobSeekerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    skills: [{
        type: String,
        trim: true
    }],
    bio: {
        type: String,
        maxlength: 1000
    },
    resume: {
        filename: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    },
    profilePicture: {
        filename: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    },
    experience: [{
        position: {
            type: String,
            required: true
        },
        company: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: Date,
        isCurrentJob: {
            type: Boolean,
            default: false
        },
        description: String
    }],
    education: [{
        degree: {
            type: String,
            required: true
        },
        institution: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: Date,
        isCurrentStudy: {
            type: Boolean,
            default: false
        },
        gpa: String
    }],
    certifications: [{
        name: {
            type: String,
            required: true
        },
        issuer: String,
        issueDate: Date,
        expiryDate: Date,
        credentialId: String
    }],
    socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String,
        twitter: String
    },
    preferences: {
        jobTypes: [{
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'internship', 'remote']
        }],
        salaryRange: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'GHS'
            }
        },
        preferredLocations: [String],
        availability: {
            type: String,
            enum: ['immediate', '2-weeks', '1-month', 'negotiable'],
            default: 'immediate'
        }
    },
    profileViews: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Company/Employer Profile Schema
const companySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    industry: {
        type: String,
        required: true,
        trim: true
    },
    companySize: {
        type: String,
        enum: ['1-10', '11-50', '51-100', '101-500', '501-1000', '1000+'],
        required: true
    },
    foundedYear: Number,
    website: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    location: {
        address: String,
        city: String,
        state: String,
        country: {
            type: String,
            default: 'Ghana'
        }
    },
    description: {
        type: String,
        maxlength: 2000
    },
    logo: {
        filename: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    },
    culture: [String],
    benefits: [String],
    offices: [{
        name: String,
        address: String,
        type: {
            type: String,
            enum: ['headquarters', 'branch', 'remote']
        }
    }],
    socialLinks: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Job Posting Schema
const jobSchema = new mongoose.Schema({
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 5000
    },
    requirements: [String],
    responsibilities: [String],
    location: {
        type: String,
        required: true
    },
    jobType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
        required: true
    },
    experienceLevel: {
        type: String,
        enum: ['entry', 'junior', 'mid', 'senior', 'executive'],
        required: true
    },
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'GHS'
        },
        negotiable: {
            type: Boolean,
            default: false
        }
    },
    skills: [String],
    benefits: [String],
    applicationDeadline: Date,
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'closed'],
        default: 'active'
    },
    views: {
        type: Number,
        default: 0
    },
    applicationsCount: {
        type: Number,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    },
    urgentHiring: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Job Application Schema
const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    employerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {
        type: String,
        enum: ['applied', 'under-review', 'shortlisted', 'interview-scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'],
        default: 'applied'
    },
    coverLetter: {
        type: String,
        maxlength: 2000
    },
    resume: {
        filename: String,
        path: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    },
    customAnswers: [{
        question: String,
        answer: String
    }],
    interviewDetails: {
        scheduledDate: Date,
        interviewType: {
            type: String,
            enum: ['phone', 'video', 'in-person', 'technical']
        },
        location: String,
        notes: String
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    employerNotes: String,
    rejectionReason: String,
    appliedAt: {
        type: Date,
        default: Date.now
    },
    lastStatusUpdate: {
        type: Date,
        default: Date.now
    }
});

// Saved Jobs Schema (Job Seeker favorites)
const savedJobSchema = new mongoose.Schema({
    jobSeekerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobSeeker',
        required: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    savedAt: {
        type: Date,
        default: Date.now
    }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['application_received', 'application_status_changed', 'job_recommendation', 'interview_scheduled', 'profile_viewed', 'new_job_posted'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: mongoose.Schema.Types.Mixed, // Additional data related to the notification
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Analytics Schema for tracking various metrics
const analyticsSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['job', 'company', 'jobseeker'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    eventType: {
        type: String,
        enum: ['view', 'application', 'save', 'click', 'search'],
        required: true
    },
    metadata: mongoose.Schema.Types.Mixed,
    userAgent: String,
    ipAddress: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Update timestamps middleware
[jobSeekerSchema, companySchema, jobSchema].forEach(schema => {
    schema.pre('save', function(next) {
        this.updatedAt = Date.now();
        next();
    });
});

// Create models
const User = mongoose.model('User', userSchema);
const JobSeeker = mongoose.model('JobSeeker', jobSeekerSchema);
const Company = mongoose.model('Company', companySchema);
const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);
const SavedJob = mongoose.model('SavedJob', savedJobSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);


export {
    User,
    JobSeeker,
    Company,
    Job,
    Application,
    SavedJob,
    Notification,
    Analytics
};
