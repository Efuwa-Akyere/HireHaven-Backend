// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import connectDb from './config/db.js';

// Middlewares
import { errorHandler } from './middleware/errorHandling.js';
import { notFound } from './middleware/notFound.js';
import passport from './config/adminGooglePassportStrategy.js'
import {
  generateToken,
  authenticateToken,
  requireJobSeeker,
  requireEmployer,
  optionalAuth,
  createRateLimit,
  validateRequest,
  asyncHandler,
  corsOptions
} from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import jobSeekerRoutes from './routes/jobSeeker.js';
import employerRoutes from './routes/employer.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import adminRoute from './routes/adminRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(
    session({
        secret: 'HireHaven-session-secret',
        resave: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        }
    })
)
app.use(passport.initialize());
app.use(passport.session());

// Database connection
connectDb();

// Security middleware
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { success: false, message: 'Too many requests, try again later.' }
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

// File upload setup
// Ensure upload folders exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir('uploads/resumes');
ensureDir('uploads/profiles');
ensureDir('uploads/applications');
ensureDir('uploads/companies');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobseeker', jobSeekerRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', adminRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HireHaven API is running',
    timestamp: new Date().toISOString()
  });
});

// Multer file error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Max 5MB allowed.' });
  }
  next(error);
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});
