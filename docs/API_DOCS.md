# HireFlow Backend — API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <accessToken>
```

---

## Response Format
All responses follow this standard structure:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

---

## 🔐 Auth Routes — `/api/v1/auth`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/register` | Public | Register a new user (candidate/hr/mentor) |
| POST | `/login` | Public | Login with email + password |
| POST | `/refresh-token` | Public | Get new access token using refresh token |
| POST | `/logout` | Private | Logout & clear refresh token |
| GET | `/me` | Private | Get current logged-in user |
| GET | `/verify-email/:token` | Public | Verify email after registration |
| POST | `/forgot-password` | Public | Send password reset email |
| POST | `/reset-password/:token` | Public | Reset password using email token |
| GET | `/google` | Public | Initiate Google OAuth login |
| GET | `/google/callback` | Public | Google OAuth callback — redirects with tokens |

### Register Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Test@1234",
  "role": "candidate"  // candidate | hr | mentor
}
```

### Login Body
```json
{
  "email": "john@example.com",
  "password": "Test@1234"
}
```

---

## 👤 Candidate Routes — `/api/v1/candidate`

All routes require `Authorization: Bearer <token>` with role = `candidate`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/profile` | Private (candidate) | Get own full profile |
| PUT | `/profile` | Private (candidate) | Update headline, bio, location, education, experience |
| PUT | `/skills` | Private (candidate) | Select skills & domains |
| PUT | `/social-links` | Private (candidate) | Update LinkedIn, GitHub, Portfolio links |
| GET | `/public/:slug` | Public | View any candidate's public profile by slug |
| POST | `/capstone` | Private (candidate) | Submit capstone project for review |
| GET | `/scorecard` | Private (candidate) | Get personal scorecard with assessment results |
| GET | `/assessments` | Private (candidate) | Get assessments based on selected domains |
| GET | `/assessments/:id` | Private (candidate) | Get one assessment to attempt |
| POST | `/assessments/:id/submit` | Private (candidate) | Submit assessment answers, get scored |
| GET | `/job-feed` | Private (candidate + verified) | Skill-matched job feed — requires blue tick |
| GET | `/my-applications` | Private (candidate) | All my job applications with status |
| DELETE | `/applications/:id` | Private (candidate) | Withdraw an application |

### Update Skills Body
```json
{
  "skills": ["skillId1", "skillId2"],
  "domains": ["domainId1"]
}
```

### Submit Assessment Body
```json
{
  "answers": [
    { "questionIndex": 0, "selectedOption": 2 },
    { "questionIndex": 1, "selectedOption": 0 }
  ],
  "timeTakenMinutes": 18
}
```

### Submit Capstone Body
```json
{
  "title": "E-Commerce App",
  "description": "Full-stack app with payments",
  "repoUrl": "https://github.com/user/app",
  "liveUrl": "https://app.vercel.app"
}
```

---

## 💼 Jobs Routes — `/api/v1/jobs`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Public | List & search all active jobs (paginated) |
| GET | `/:slug` | Public | Get single job details by slug |
| POST | `/:id/apply` | Private (candidate) | Apply to a job — verified candidates only if `requiresVerification: true` |

### Job Search Query Params
```
GET /api/v1/jobs?search=nodejs&workMode=remote&jobType=full-time&experienceLevel=mid&domain=ID&page=1&limit=12
```

### Apply Body
```json
{
  "coverLetter": "I am excited about this opportunity...",
  "resumeUrl": "https://drive.google.com/resume.pdf"
}
```

---

## 🏢 HR Routes — `/api/v1/hr`

All routes require `Authorization: Bearer <token>` with role = `hr`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/profile` | Private (hr) | Get own HR profile |
| PUT | `/profile` | Private (hr) | Update company info, designation, location |
| POST | `/jobs` | Private (hr + verified) | Post a new job — HR must be admin-verified |
| GET | `/jobs` | Private (hr) | List all jobs posted by this HR |
| PUT | `/jobs/:id` | Private (hr + verified) | Update a job posting |
| GET | `/jobs/:id/applications` | Private (hr) | View all applications for a job |
| PUT | `/applications/:id` | Private (hr) | Update application status, add notes, schedule interview |

### Post Job Body
```json
{
  "title": "Senior Node.js Developer",
  "description": "We need a backend engineer...",
  "requirements": ["3+ years Node.js", "MongoDB experience"],
  "responsibilities": ["Build APIs", "Code reviews"],
  "domain": "domainId",
  "requiredSkills": ["skillId1", "skillId2"],
  "jobType": "full-time",
  "workMode": "hybrid",
  "experienceLevel": "senior",
  "minExperience": 3,
  "maxExperience": 6,
  "location": "Bangalore / Remote",
  "salaryMin": 1200000,
  "salaryMax": 2000000,
  "salaryCurrency": "INR",
  "totalOpenings": 2,
  "applicationDeadline": "2025-06-30T00:00:00Z",
  "requiresVerification": true
}
```

### Update Application Status Body
```json
{
  "status": "shortlisted",
  "hrNotes": "Strong profile",
  "rating": 4,
  "interviewDate": "2025-05-20T10:00:00Z",
  "interviewLink": "https://meet.google.com/abc",
  "interviewType": "video"
}
```

Application Status Flow: `applied → shortlisted → interview_scheduled → interview_done → offered → hired`

---

## 🎓 Mentor Routes — `/api/v1/mentor`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Public | List all verified mentors (filterable) |
| GET | `/profile` | Private (mentor) | Get own mentor profile |
| PUT | `/profile` | Private (mentor) | Update bio, rates, availability, expertise |
| POST | `/:mentorId/book` | Private (candidate) | Book a mentor session |
| GET | `/sessions` | Private (mentor) | Get all mentor's sessions |
| PUT | `/sessions/:id` | Private (mentor) | Confirm/cancel session, add meet link |
| POST | `/sessions/:id/rate` | Private (candidate) | Rate a completed session |

### Update Mentor Profile Body
```json
{
  "headline": "Senior Engineer at Google | 8 YOE",
  "bio": "Helping devs grow",
  "yearsOfExperience": 8,
  "currentCompany": "Google",
  "currentRole": "Senior SWE",
  "hourlyRate": 2000,
  "monthlyRate": 15000,
  "currency": "INR",
  "isFreeFirstSession": true,
  "availability": [
    { "day": "Sat", "slots": [{ "startTime": "10:00", "endTime": "14:00" }] }
  ]
}
```

### Book Session Body
```json
{
  "sessionType": "hourly",
  "scheduledAt": "2025-06-01T10:00:00Z",
  "durationMinutes": 60,
  "topic": "System Design Prep"
}
```

---

## 🛡️ Admin Routes — `/api/v1/admin`

All routes require `Authorization: Bearer <token>` with role = `admin`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/dashboard` | Admin | Platform stats — users, jobs, verifications |
| GET | `/users` | Admin | List all users with filters |
| PUT | `/verify/:userId` | Admin | Verify or reject any user profile |
| GET | `/pending/:role` | Admin | List pending verifications by role |
| PUT | `/users/:id/toggle-active` | Admin | Activate or deactivate a user |
| GET | `/domains` | Admin | List all domains |
| POST | `/domains` | Admin | Create a new domain |
| PUT | `/domains/:id` | Admin | Update a domain |
| GET | `/skills` | Admin | List skills (filter by domain) |
| POST | `/skills` | Admin | Create a new skill |
| GET | `/assessments` | Admin | List all assessments |
| POST | `/assessments` | Admin | Create a new assessment with questions |
| POST | `/jobs` | Admin | Post a job as admin |

### Verify User Body
```json
{
  "action": "verify",  // "verify" | "reject"
  "note": "Profile reviewed and approved"
}
```

### Create Domain Body
```json
{
  "name": "Backend Development",
  "description": "Server-side development",
  "icon": "server"
}
```

### Create Assessment Body
```json
{
  "title": "Node.js Basics",
  "domain": "domainId",
  "skill": "skillId",
  "level": "beginner",
  "durationMinutes": 30,
  "questions": [
    {
      "questionText": "What is the event loop?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1,
      "explanation": "Explanation here",
      "marks": 2
    }
  ]
}
```

---

## 📊 Database Models & Indexes

### User
- `email` — unique index
- `role` — index
- `googleId` — index
- `isVerified + role` — compound index

### CandidateProfile
- `user` — unique index
- `publicSlug` — unique sparse index
- `skills` — index (for job matching)
- `domains` — index (for job matching)
- `overallScore` — descending index

### Job
- `slug` — unique index
- `domain + requiredSkills` — indexes
- `status` — index
- `title + description` — text index (for search)

### Application
- `job + candidate` — unique compound index (prevents duplicate applications)
- `candidate` — index
- `status` — index

### MentorSession
- `mentor + scheduledAt` — compound index (for clash detection)
- `paymentStatus` — index

---

## 🚀 Quick Start

### 1. Install
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Fill in your MONGO_URI, JWT secrets, Google OAuth credentials
```

### 3. Create Admin User (manual MongoDB)
```js
db.users.insertOne({
  name: "Admin",
  email: "admin@hireflow.com",
  password: "<bcrypt hashed>",
  role: "admin",
  isEmailVerified: true,
  isVerified: true,
  isActive: true
})
```

### 4. Run
```bash
npm run dev        # Development
npm start          # Production
npm test           # Run all tests
npm run test:coverage  # Tests with coverage report
```

### 5. Postman
Import `/postman/HireFlow_API.postman_collection.json` into Postman

---

## 📁 Project Structure

```
src/
├── config/
│   ├── db.js          ← MongoDB connection
│   ├── passport.js    ← JWT + Google OAuth strategies
│   └── logger.js      ← Winston logger
├── controllers/
│   ├── auth/          ← Register, Login, OAuth, Password reset
│   ├── candidate/     ← Profile, Skills, Assessments, Applications
│   ├── hr/            ← HR profile, Job posting, Applications management
│   ├── mentor/        ← Mentor profile, Sessions, Booking
│   └── admin/         ← Verify users, Domains, Skills, Assessments
├── middleware/
│   ├── auth.middleware.js    ← protect, authorizeRoles, isVerified
│   ├── error.middleware.js   ← Global error handler
│   └── validate.middleware.js ← express-validator errors
├── models/
│   ├── User.model.js
│   ├── CandidateProfile.model.js
│   ├── HRProfile.model.js
│   ├── MentorProfile.model.js
│   ├── Job.model.js
│   ├── Application.model.js
│   ├── Assessment.model.js   ← Assessment + AssessmentResult
│   ├── Domain.model.js       ← Domain + Skill
│   └── MentorSession.model.js
├── routes/v1/
│   ├── auth.routes.js
│   ├── candidate.routes.js
│   ├── hr.routes.js
│   ├── mentor.routes.js
│   ├── admin.routes.js
│   └── job.routes.js
├── utils/
│   ├── ApiError.js
│   ├── ApiResponse.js
│   ├── asyncHandler.js
│   ├── generateToken.js
│   ├── slugify.js
│   └── email.js
├── app.js
└── server.js
```

---

## 🔑 Key Business Rules

1. **Candidate verification** — Candidates must complete assessments + capstone → Admin verifies → Blue tick badge unlocked → Job feed accessible
2. **HR verification** — HR must be verified by admin before posting jobs
3. **Mentor verification** — Mentor must be verified by admin before appearing in listings
4. **Job application** — If `requiresVerification: true` on a job, only candidates with blue tick can apply
5. **Unique public profiles** — Every candidate gets a `/profile/{slug}` like LinkedIn
6. **Duplicate application prevention** — MongoDB unique compound index on `{job, candidate}`
7. **Assessment scoring** — Auto-graded, 60% to pass, score averaged into overall profile score
