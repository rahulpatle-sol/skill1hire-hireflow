const mongoose = require("mongoose");

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    portfolio: { type: String, default: "" },
    twitter: { type: String, default: "" },
    leetcode: { type: String, default: "" },
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: { type: String },
    startYear: { type: Number },
    endYear: { type: Number },
    grade: { type: String },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    isCurrent: { type: Boolean, default: false },
    description: { type: String },
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
    // Public profile slug — e.g. /profile/john-doe-xyz123
    publicSlug: { type: String, unique: true, sparse: true },
    headline: { type: String, maxlength: 200, default: "" },
    bio: { type: String, maxlength: 1000, default: "" },
    location: { type: String, default: "" },
    phone: { type: String, default: "" },

    // Domains selected by candidate (multi-select)
    domains: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain" }],
    // Skills selected by candidate (multi-select)
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],

    socialLinks: { type: socialLinksSchema, default: () => ({}) },
    education: [educationSchema],
    experience: [experienceSchema],

    resumeUrl: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },

    // Verification & Badge
    isVerified: { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String, default: "" },

    // Capstone project
    capstoneProject: {
      title: { type: String },
      description: { type: String },
      repoUrl: { type: String },
      liveUrl: { type: String },
      submittedAt: { type: Date },
      status: {
        type: String,
        enum: ["not_submitted", "pending_review", "approved", "rejected"],
        default: "not_submitted",
      },
    },

    // Overall score from assessments
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
    isProfilePublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────
// user is already indexed via unique:true, publicSlug via unique:true sparse
candidateProfileSchema.index({ isVerified: 1 });
candidateProfileSchema.index({ skills: 1 });
candidateProfileSchema.index({ domains: 1 });
candidateProfileSchema.index({ overallScore: -1 });

module.exports = mongoose.model("CandidateProfile", candidateProfileSchema);
