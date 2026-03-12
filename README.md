# HireFlow Backend API 🚀

A full-featured hiring portal backend built with Node.js, Express.js, and MongoDB.

## Features
- **Candidate Zone** — Profile, Skills, Assessments, Scorecard, Public Profile, Job Feed (verified only)
- **HR Zone** — Job Posting, Application Management, Candidate Tracking
- **Mentor Zone** — Profile, Session Booking, Paid Sessions, Ratings
- **Admin** — Verify users, Manage Domains/Skills/Assessments, Dashboard

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + Google OAuth (Passport.js)
- **Testing**: Jest + Supertest + MongoDB Memory Server

## Quick Start
```bash
npm install
cp .env.example .env      # Fill in your credentials
npm run dev               # Start dev server
npm test                  # Run tests
```

## Docs
- Full API Docs → `/docs/API_DOCS.md`
- Postman Collection → `/postman/HireFlow_API.postman_collection.json`

## Deployment
- **Backend**: Render.com (`npm start`)
- **Frontend**: Vercel (Next.js)
# skill1hire-hireflow
