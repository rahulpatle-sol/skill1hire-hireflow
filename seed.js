/**
 * Skill1 Hire — Fresh Seed Script (Wipes DB and creates all role types)
 * Usage: node seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🧹 Wiping completely fresh starting state...");
    await mongoose.connection.db.dropDatabase();
    console.log("🗑️  Database cleared.");

    const User = require("./src/models/User.model");
    const CandidateProfile = require("./src/models/CandidateProfile.model");
    const HRProfile = require("./src/models/HRProfile.model");
    const MentorProfile = require("./src/models/MentorProfile.model");
    const { Domain } = require("./src/models/Domain.model"); // For Manager

    // Let the User model pre-save hook hash this!
    const baseUser = { password: "Test@1234", isEmailVerified: true, isVerified: true, isActive: true };

    // ── 1. Master Admin ──────────────────────────────────────
    await User.create({ name: "Master Admin Mitra", email: "master@test.com", role: "master", ...baseUser });
    console.log("👑 Master Admin created — master@test.com");

    // ── 2. Standard Admin ────────────────────────────────────
    await User.create({ name: "System Admin Aditi", email: "admin@test.com", role: "admin", ...baseUser });
    console.log("🛠️  Admin created — admin@test.com");

    // ── 3. Domain & Manager ──────────────────────────────────
    const domain = await Domain.create({
      name: "Software Engineering",
      slug: "software-engineering",
      description: "Code and architecture."
    });
    await User.create({
      name: "Domain Manager Rahul", email: "manager@test.com", role: "manager", domain: domain._id, ...baseUser
    });
    console.log("🗂️  Manager created (assigned to Software Engineering domain) — manager@test.com");

    // ── 4. HR / Recruiter ────────────────────────────────────
    const hrUser = await User.create({ name: "Priya HR Recruiter", email: "hr@test.com", role: "hr", ...baseUser });
    await HRProfile.create({
      user: hrUser._id, companyName: "TechCorp India", designation: "Talent Lead", location: "Bangalore",
      skills: ["Hiring", "JavaScript"], plan: "pro", isPremium: true, isVerified: true, verificationStatus: "verified",
    });
    console.log("👔 HR/Recruiter created — hr@test.com");

    // ── 5. Mentor ────────────────────────────────────────────
    const mUser = await User.create({ name: "Siddharth Mentor", email: "mentor@test.com", role: "mentor", ...baseUser });
    await MentorProfile.create({
      user: mUser._id, company: "Amazon", role: "Senior Software Engineer", hourlyRate: 50,
      skills: ["System Design", "AWS", "Java", "Node.js"], bio: "Staff engineer at Amazon with 8 YOE.",
      isVerified: true, rating: 4.8, totalSessions: 12,
    });
    console.log("🌟 Mentor created — mentor@test.com");

    // ── 6. Candidate ─────────────────────────────────────────
    const cUser = await User.create({ name: "Mitra Candidate", email: "candidate@test.com", role: "candidate", ...baseUser });
    await CandidateProfile.create({
      user: cUser._id, headline: "Full-Stack Developer | React & Node.js", bio: "Building real products.",
      location: "Delhi, India", overallScore: 72, profileCompleteness: 85,
      education: [{ institution: "IIT Delhi", degree: "B.Tech", fieldOfStudy: "CSE", startYear: 2019, endYear: 2023 }],
      experience: [{ company: "Startup X", role: "Frontend Intern", startDate: new Date("2022-06-01"), endDate: new Date("2022-09-01"), isCurrent: false, description: "Built the landing page." }],
      certifications: [{ name: "AWS CCP", issuer: "Amazon", issueDate: new Date("2023-01-10") }],
      isVerified: true, verificationStatus: "verified",
    });
    console.log("🎓 Candidate created — candidate@test.com");


    console.log("\n🔑 ALL LOGIN CREDENTIALS:");
    console.log("All accounts use the same password: Test@1234\n");
    console.log("  Master   → master@test.com");
    console.log("  Admin    → admin@test.com");
    console.log("  Manager  → manager@test.com");
    console.log("  HR       → hr@test.com");
    console.log("  Mentor   → mentor@test.com");
    console.log("  Candidate→ candidate@test.com");
    
    console.log("\n✅ Database fresh seed completed successfully!");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
