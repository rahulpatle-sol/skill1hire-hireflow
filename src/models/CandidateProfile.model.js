const mongoose = require("mongoose");

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin:  { type: String, default: "" },
    github:    { type: String, default: "" },
    portfolio: { type: String, default: "" },
    twitter:   { type: String, default: "" },
    leetcode:  { type: String, default: "" },
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    institution:  { type: String, required: true },
    degree:       { type: String, required: true },
    fieldOfStudy: { type: String },
    startYear:    { type: Number },
    endYear:      { type: Number },
    grade:        { type: String },
  },
  { _id: false }
);
//  ad in backend also  ui 
const experienceSchema = new mongoose.Schema(
  {
    company:     { type: String, required: true },
    role:        { type: String, required: true },
    startDate:   { type: Date },
    endDate:     { type: Date },
    isCurrent:   { type: Boolean, default: false },
    description: { type: String },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    issueDate: { type: Date },
    expirationDate: { type: Date },
    credentialId: { type: String },
    credentialUrl: { type: String },
  },
  { _id: false }
);

const candidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // LinkedIn-style public URL: /candidate/john-doe-abc123
    publicSlug: { type: String, unique: true, sparse: true },

    headline: { type: String, maxlength: 200, default: "" },
    bio:      { type: String, maxlength: 1000, default: "" },
    location: { type: String, default: "" },
    phone:    { type: String, default: "" },

    // ── Skills & Domains ─────────────────────────
    domains: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain" }],
    skills:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],

    socialLinks: { type: socialLinksSchema, default: () => ({}) },
    education:   [educationSchema],
    experience:  [experienceSchema],
    certifications: [certificationSchema],

    // ── File Uploads ─────────────────────────────
    resumeUrl: { type: String, default: "" },   // PDF resume URL
    avatarUrl: { type: String, default: "" },   // Profile picture URL

    // ── Admin-assigned assessments ───────────────
    // Admin can pin specific assessments to this candidate
    assignedAssessments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assessment" }],

    // ── Verification ─────────────────────────────
    isVerified:    { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String, default: "" },

    // ── Capstone ──────────────────────────────────
    capstoneProject: {
      title:       { type: String },
      description: { type: String },
      repoUrl:     { type: String },
      liveUrl:     { type: String },
      submittedAt: { type: Date },
      status: {
        type: String,
        enum: ["not_submitted", "pending_review", "approved", "rejected"],
        default: "not_submitted",
      },
    },

    // ── Scores & Streaks ─────────────────────────
    overallScore:       { type: Number, default: 0, min: 0, max: 100 },
    assessmentScore:    { type: Number, default: 0, min: 0, max: 100 },
    profileCompleteness:{ type: Number, default: 0, min: 0, max: 100 },
    totalAssessmentsPassed: { type: Number, default: 0 },
    totalAssignmentsCompleted: { type: Number, default: 0 },
    streakDays:         { type: Number, default: 0 },
    streakCommits:      { type: Number, default: 0 },

    isProfilePublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────
candidateProfileSchema.index({ isVerified: 1 });
candidateProfileSchema.index({ skills: 1 });
candidateProfileSchema.index({ domains: 1 });
candidateProfileSchema.index({ overallScore: -1 });

module.exports = mongoose.model("CandidateProfile", candidateProfileSchema);