const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, JobSeeker, Company, Job, Application, SavedJob } = require('../models');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hirehaven');
        console.log('MongoDB connected for seeding');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Clear existing data
        await User.deleteMany({});
        await JobSeeker.deleteMany({});
        await Company.deleteMany({});
        await Job.deleteMany({});
        await Application.deleteMany({});
        await SavedJob.deleteMany({});
        console.log('✅ Cleared existing data');

        // Create sample users
        const hashedPassword = await bcrypt.hash('password123', 12);

        // Job Seekers
        const jobSeekerUsers = [
            {
                email: 'john.doe@email.com',
                password: hashedPassword,
                userType: 'jobseeker',
                emailVerified: true
            },
            {
                email: 'sarah.mensah@email.com',
                password: hashedPassword,
                userType: 'jobseeker',
                emailVerified: true
            },
            {
                email: 'kwame.asante@email.com',
                password: hashedPassword,
                userType: 'jobseeker',
                emailVerified: true
            }
        ];

        const createdJobSeekerUsers = await User.insertMany(jobSeekerUsers);
        console.log('✅ Created job seeker users');

        // Employer Users
        const employerUsers = [
            {
                email: 'hr@techcorp.com',
                password: hashedPassword,
                userType: 'employer',
                emailVerified: true
            },
            {
                email: 'hiring@digitalinnovations.com',
                password: hashedPassword,
                userType: 'employer',
                emailVerified: true
            },
            {
                email: 'careers@startupHub.com',
                password: hashedPassword,
                userType: 'employer',
                emailVerified: true
            }
        ];

        const createdEmployerUsers = await User.insertMany(employerUsers);
        console.log('✅ Created employer users');

        // Create Job Seeker Profiles
        const jobSeekerProfiles = [
            {
                userId: createdJobSeekerUsers[0]._id,
                firstName: 'John',
                lastName: 'Doe',
                phone: '0245678901',
                location: 'Abokobi, Accra, Ghana',
                skills: ['CSS', 'HTML', 'JavaScript', 'React', 'Node.js'],
                bio: 'Passionate frontend developer with 3 years of experience building responsive web applications.',
                experience: [
                    {
                        position: 'Junior Frontend Developer',
                        company: 'WebCraft Agency',
                        startDate: new Date('2023-01-01'),
                        isCurrentJob: true,
                        description: 'Developing responsive web applications using React and modern CSS'
                    },
                    {
                        position: 'Web Development Intern',
                        company: 'Digital Hub Ghana',
                        startDate: new Date('2022-01-01'),
                        endDate: new Date('2022-12-31'),
                        isCurrentJob: false,
                        description: 'Built websites using HTML, CSS, and JavaScript for local businesses'
                    }
                ],
                education: [
                    {
                        degree: 'BSc Computer Science',
                        institution: 'University of Ghana',
                        startDate: new Date('2019-01-01'),
                        endDate: new Date('2023-06-01')
                    }
                ],
                certifications: [
                    {
                        name: 'React Developer Certification',
                        issuer: 'Meta',
                        issueDate: new Date('2023-03-01')
                    },
                    {
                        name: 'JavaScript Algorithms',
                        issuer: 'freeCodeCamp',
                        issueDate: new Date('2022-08-01')
                    }
                ],
                socialLinks: {
                    linkedin: 'https://linkedin.com/in/johndoe',
                    github: 'https://github.com/johndoe'
                },
                preferences: {
                    jobTypes: ['full-time', 'remote'],
                    salaryRange: { min: 3000, max: 8000, currency: 'GHS' },
                    preferredLocations: ['Accra', 'Remote'],
                    availability: 'immediate'
                },
                profileViews: 24
            },
            {
                userId: createdJobSeekerUsers[1]._id,
                firstName: 'Sarah',
                lastName: 'Mensah',
                phone: '0241234567',
                location: 'East Legon, Accra, Ghana',
                skills: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'AWS'],
                bio: 'Senior Frontend Developer with expertise in React ecosystem and modern web technologies.',
                experience: [
                    {
                        position: 'Senior Frontend Developer',
                        company: 'TechFlow Solutions',
                        startDate: new Date('2021-01-01'),
                        isCurrentJob: true,
                        description: 'Lead frontend development for enterprise applications using React and TypeScript'
                    }
                ],
                education: [
                    {
                        degree: 'MSc Information Systems',
                        institution: 'KNUST',
                        startDate: new Date('2018-01-01'),
                        endDate: new Date('2020-06-01')
                    }
                ],
                profileViews: 45
            },
            {
                userId: createdJobSeekerUsers[2]._id,
                firstName: 'Kwame',
                lastName: 'Asante',
                phone: '0207891234',
                location: 'Tema, Ghana',
                skills: ['Product Strategy', 'Agile', 'Analytics', 'User Research', 'Figma'],
                bio: 'Experienced Product Manager with a track record of launching successful digital products.',
                experience: [
                    {
                        position: 'Product Manager',
                        company: 'InnovateTech Ghana',
                        startDate: new Date('2020-01-01'),
                        isCurrentJob: true,
                        description: 'Leading product development for fintech applications serving West African markets'
                    }
                ],
                education: [
                    {
                        degree: 'MBA',
                        institution: 'University of Ghana Business School',
                        startDate: new Date('2016-01-01'),
                        endDate: new Date('2018-06-01')
                    }
                ],
                profileViews: 67
            }
        ];

        const createdJobSeekers = await JobSeeker.insertMany(jobSeekerProfiles);
        console.log('✅ Created job seeker profiles');

        // Create Company Profiles
        const companyProfiles = [
            {
                userId: createdEmployerUsers[0]._id,
                companyName: 'TechCorp Solutions',
                industry: 'Software Development & IT Services',
                companySize: '51-100',
                foundedYear: 2018,
                website: 'https://techcorp.com',
                phone: '0302123456',
                location: {
                    address: 'East Legon',
                    city: 'Accra',
                    state: 'Greater Accra',
                    country: 'Ghana'
                },
                description: 'Leading technology company providing innovative software solutions for businesses across West Africa.',
                culture: [
                    'Innovation-driven environment',
                    'Work-life balance priority',
                    'Professional development opportunities',
                    'Collaborative team culture'
                ],
                benefits: [
                    'Health insurance coverage',
                    'Flexible working arrangements',
                    'Professional training budget',
                    'Performance bonuses',
                    'Retirement savings plan'
                ],
                offices: [
                    {
                        name: 'Head Office - Accra',
                        address: 'East Legon, Accra, Ghana',
                        type: 'headquarters'
                    },
                    {
                        name: 'Kumasi Branch',
                        address: 'Ahodwo, Kumasi, Ghana',
                        type: 'branch'
                    }
                ],
                socialLinks: {
                    linkedin: 'https://linkedin.com/company/techcorp',
                    twitter: 'https://twitter.com/techcorp'
                },
                verificationStatus: 'verified'
            },
            {
                userId: createdEmployerUsers[1]._id,
                companyName: 'Digital Innovations Ltd',
                industry: 'Digital Marketing & E-commerce',
                companySize: '11-50',
                foundedYear: 2020,
                website: 'https://digitalinnovations.com',
                phone: '0501234567',
                location: {
                    address: 'Airport Residential Area',
                    city: 'Accra',
                    state: 'Greater Accra',
                    country: 'Ghana'
                },
                description: 'Cutting-edge digital solutions for modern businesses, specializing in e-commerce and digital transformation.',
                culture: [
                    'Remote-first culture',
                    'Continuous learning',
                    'Diversity and inclusion',
                    'Customer-centric approach'
                ],
                benefits: [
                    'Remote work options',
                    'Learning stipend',
                    'Health insurance',
                    'Flexible hours'
                ],
                verificationStatus: 'verified'
            },
            {
                userId: createdEmployerUsers[2]._id,
                companyName: 'StartUp Hub',
                industry: 'Technology Incubator',
                companySize: '1-10',
                foundedYear: 2022,
                website: 'https://startuphub.gh',
                phone: '0203456789',
                location: {
                    address: 'Labone',
                    city: 'Accra',
                    state: 'Greater Accra',
                    country: 'Ghana'
                },
                description: 'Supporting early-stage startups with mentorship, funding, and resources to scale innovative solutions.',
                culture: [
                    'Entrepreneurial mindset',
                    'Risk-taking encouraged',
                    'Mentorship focused',
                    'Community building'
                ],
                benefits: [
                    'Equity opportunities',
                    'Mentorship programs',
                    'Networking events',
                    'Flexible workspace'
                ],
                verificationStatus: 'pending'
            }
        ];

        const createdCompanies = await Company.insertMany(companyProfiles);
        console.log('✅ Created company profiles');

        // Create Sample Jobs
        const jobs = [
            {
                employerId: createdCompanies[0]._id,
                title: 'Senior Frontend Developer',
                department: 'Engineering',
                description: 'We are seeking a talented Senior Frontend Developer to join our dynamic team. You will be responsible for developing user-facing features using modern JavaScript frameworks, collaborating with designers and backend developers to create seamless user experiences.',
                requirements: [
                    '5+ years of experience in frontend development',
                    'Expert knowledge of React.js and TypeScript',
                    'Experience with state management (Redux, Context API)',
                    'Proficiency in CSS preprocessors and CSS-in-JS',
                    'Experience with testing frameworks (Jest, React Testing Library)',
                    'Knowledge of build tools and bundlers (Webpack, Vite)',
                    'Understanding of web performance optimization'
                ],
                responsibilities: [
                    'Develop and maintain high-quality frontend applications',
                    'Collaborate with design and backend teams',
                    'Write clean, maintainable, and testable code',
                    'Optimize applications for maximum speed and scalability',
                    'Mentor junior developers and conduct code reviews',
                    'Stay updated with latest frontend technologies and best practices'
                ],
                location: 'Accra, Ghana',
                jobType: 'full-time',
                experienceLevel: 'senior',
                salary: {
                    min: 8000,
                    max: 12000,
                    currency: 'GHS',
                    negotiable: true
                },
                skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Redux', 'Jest'],
                benefits: [
                    'Health insurance',
                    'Flexible working hours',
                    'Professional development budget',
                    'Remote work options',
                    'Performance bonuses'
                ],
                applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                status: 'active',
                views: 156,
                applicationsCount: 24,
                featured: true
            },
            {
                employerId: createdCompanies[1]._id,
                title: 'Product Manager',
                department: 'Product',
                description: 'Join our product team as a Product Manager to drive the development of innovative digital solutions. You will work closely with engineering, design, and business teams to define product strategy and deliver exceptional user experiences.',
                requirements: [
                    '3+ years of product management experience',
                    'Experience with agile development methodologies',
                    'Strong analytical and data-driven decision making skills',
                    'Excellent communication and stakeholder management',
                    'Experience with product analytics tools',
                    'Understanding of user experience and design principles'
                ],
                responsibilities: [
                    'Define and execute product roadmap',
                    'Gather and prioritize product requirements',
                    'Work with engineering teams to deliver features',
                    'Analyze product metrics and user feedback',
                    'Collaborate with design team on user experience',
                    'Present product updates to stakeholders'
                ],
                location: 'Remote',
                jobType: 'full-time',
                experienceLevel: 'mid',
                salary: {
                    min: 10000,
                    max: 15000,
                    currency: 'GHS',
                    negotiable: true
                },
                skills: ['Product Strategy', 'Agile', 'Analytics', 'User Research', 'Stakeholder Management'],
                benefits: [
                    'Remote work',
                    'Learning budget',
                    'Health insurance',
                    'Equity options',
                    'Flexible schedule'
                ],
                applicationDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                status: 'active',
                views: 203,
                applicationsCount: 18,
                featured: false
            },
            {
                employerId: createdCompanies[2]._id,
                title: 'UI/UX Designer',
                department: 'Design',
                description: 'We are looking for a creative UI/UX Designer to create engaging and intuitive user interfaces for our startup portfolio companies. You will be responsible for the entire design process from concept to final implementation.',
                requirements: [
                    '3+ years of UI/UX design experience',
                    'Proficiency in design tools (Figma, Sketch, Adobe Creative Suite)',
                    'Experience with user research and usability testing',
                    'Strong portfolio demonstrating design thinking',
                    'Knowledge of responsive and mobile design principles',
                    'Understanding of frontend development constraints'
                ],
                responsibilities: [
                    'Design user interfaces for web and mobile applications',
                    'Conduct user research and usability testing',
                    'Create wireframes, prototypes, and design systems',
                    'Collaborate with developers on implementation',
                    'Present design concepts to stakeholders',
                    'Maintain and evolve design standards'
                ],
                location: 'Hybrid',
                jobType: 'contract',
                experienceLevel: 'mid',
                salary: {
                    min: 6000,
                    max: 9000,
                    currency: 'GHS',
                    negotiable: false
                },
                skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Adobe Creative Suite'],
                benefits: [
                    'Flexible working arrangements',
                    'Creative freedom',
                    'Access to design tools',
                    'Networking opportunities'
                ],
                applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                status: 'active',
                views: 189,
                applicationsCount: 31
            },
            {
                employerId: createdCompanies[0]._id,
                title: 'Backend Developer',
                department: 'Engineering',
                description: 'Join our backend team to build scalable and secure server-side applications. You will work with modern technologies to create APIs and services that power our frontend applications.',
                requirements: [
                    '3+ years of backend development experience',
                    'Proficiency in Node.js and Python',
                    'Experience with databases (MongoDB, PostgreSQL)',
                    'Knowledge of RESTful API design',
                    'Understanding of cloud platforms (AWS, GCP)',
                    'Experience with containerization (Docker)'
                ],
                responsibilities: [
                    'Develop and maintain backend services and APIs',
                    'Design database schemas and optimize queries',
                    'Implement security best practices',
                    'Write comprehensive tests',
                    'Deploy and monitor applications',
                    'Collaborate with frontend developers'
                ],
                location: 'Accra, Ghana',
                jobType: 'full-time',
                experienceLevel: 'mid',
                salary: {
                    min: 7000,
                    max: 10000,
                    currency: 'GHS',
                    negotiable: true
                },
                skills: ['Node.js', 'Python', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker'],
                benefits: [
                    'Health insurance',
                    'Professional development',
                    'Flexible hours',
                    'Team building activities'
                ],
                applicationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
                status: 'active',
                views: 134,
                applicationsCount: 19
            },
            {
                employerId: createdCompanies[1]._id,
                title: 'Digital Marketing Specialist',
                department: 'Marketing',
                description: 'We are seeking a Digital Marketing Specialist to develop and execute marketing campaigns across various digital channels. You will help drive brand awareness and customer acquisition for our clients.',
                requirements: [
                    '2+ years of digital marketing experience',
                    'Experience with Google Ads and Facebook Ads',
                    'Knowledge of SEO and content marketing',
                    'Proficiency in analytics tools (Google Analytics, etc.)',
                    'Strong writing and communication skills',
                    'Experience with email marketing platforms'
                ],
                responsibilities: [
                    'Develop and execute digital marketing strategies',
                    'Manage social media accounts and campaigns',
                    'Create and optimize advertising campaigns',
                    'Analyze campaign performance and ROI',
                    'Create marketing content and materials',
                    'Stay updated with digital marketing trends'
                ],
                location: 'Remote',
                jobType: 'full-time',
                experienceLevel: 'junior',
                salary: {
                    min: 4000,
                    max: 6500,
                    currency: 'GHS',
                    negotiable: false
                },
                skills: ['Google Ads', 'Facebook Ads', 'SEO', 'Content Marketing', 'Analytics', 'Social Media'],
                benefits: [
                    'Remote work',
                    'Performance bonuses',
                    'Training opportunities',
                    'Health insurance'
                ],
                applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                status: 'active',
                views: 98,
                applicationsCount: 15
            }
        ];

        const createdJobs = await Job.insertMany(jobs);
        console.log('✅ Created sample jobs');

        // Create Sample Applications
        const applications = [
            {
                jobId: createdJobs[0]._id, // Senior Frontend Developer
                jobSeekerId: createdJobSeekers[0]._id, // John Doe
                employerId: createdCompanies[0]._id,
                status: 'under-review',
                coverLetter: 'I am excited to apply for the Senior Frontend Developer position. With my experience in React and modern web technologies, I believe I would be a great fit for your team.',
                appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                jobId: createdJobs[1]._id, // Product Manager
                jobSeekerId: createdJobSeekers[2]._id, // Kwame Asante
                employerId: createdCompanies[1]._id,
                status: 'interview-scheduled',
                coverLetter: 'As an experienced Product Manager, I am thrilled about the opportunity to contribute to your innovative digital solutions.',
                interviewDetails: {
                    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                    interviewType: 'video',
                    notes: 'Video interview scheduled for product strategy discussion'
                },
                appliedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
            },
            {
                jobId: createdJobs[2]._id, // UI/UX Designer
                jobSeekerId: createdJobSeekers[1]._id, // Sarah Mensah
                employerId: createdCompanies[2]._id,
                status: 'shortlisted',
                coverLetter: 'I am passionate about creating user-centered designs and would love to contribute to your startup ecosystem.',
                rating: 4.2,
                appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
            }
        ];

        const createdApplications = await Application.insertMany(applications);
        console.log('✅ Created sample applications');

        // Create Sample Saved Jobs
        const savedJobs = [
            {
                jobSeekerId: createdJobSeekers[0]._id, // John Doe
                jobId: createdJobs[1]._id, // Product Manager
                savedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                jobSeekerId: createdJobSeekers[0]._id, // John Doe
                jobId: createdJobs[3]._id, // Backend Developer
                savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                jobSeekerId: createdJobSeekers[1]._id, // Sarah Mensah
                jobId: createdJobs[0]._id, // Senior Frontend Developer
                savedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ];

        await SavedJob.insertMany(savedJobs);
        console.log('✅ Created saved jobs');

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Sample Accounts Created:');
        console.log('👤 Job Seekers:');
        console.log('   • john.doe@email.com (password: password123)');
        console.log('   • sarah.mensah@email.com (password: password123)');
        console.log('   • kwame.asante@email.com (password: password123)');
        console.log('\n🏢 Employers:');
        console.log('   • hr@techcorp.com (password: password123)');
        console.log('   • hiring@digitalinnovations.com (password: password123)');
        console.log('   • careers@startupHub.com (password: password123)');
        console.log('\n📊 Data Summary:');
        console.log(`   • Users: ${createdJobSeekerUsers.length + createdEmployerUsers.length}`);
        console.log(`   • Job Seekers: ${createdJobSeekers.length}`);
        console.log(`   • Companies: ${createdCompanies.length}`);
        console.log(`   • Jobs: ${createdJobs.length}`);
        console.log(`   • Applications: ${createdApplications.length}`);
        console.log(`   • Saved Jobs: ${savedJobs.length}`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the seed script
(async () => {
    await connectDB();
    await seedData();
})();