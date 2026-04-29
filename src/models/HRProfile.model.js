const mongoose = require("mongoose");

const hrProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    publicSlug: { type: String, unique: true, sparse: true },

    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    companyWebsite: { type: String, default: "" },
    companyLogo:    { type: String, default: "" },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      default: "1-10",
    },
    industry:    { type: String, default: "" },
    designation: { type: String, default: "" },
    phone:       { type: String, default: "" },
    location:    { type: String, default: "" },
    bio:         { type: String, maxlength: 500, default: "" },

    // ── Subscription / Plan ───────────────────────
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    planSince:     { type: Date },
    planExpiresAt: { type: Date },
    isPremium:   { type: Boolean, default: false },
    premiumSince: { type: Date },

    // ── Verification ──────────────────────────────
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String, default: "" },
    verifiedAt:       { type: Date },

    // ── LinkedIn-style Personal Profile ───────────
    headline:  { type: String, maxlength: 220, default: "" },
    summary:   { type: String, maxlength: 2000, default: "" },
    skills:    [{ type: String }],

    socialLinks: {
      linkedin:  { type: String, default: "" },
      twitter:   { type: String, default: "" },
      github:    { type: String, default: "" },
      portfolio: { type: String, default: "" },
    },

    experience: [
      {
        company:     { type: String, required: true },
        role:        { type: String, required: true },
        startDate:   { type: Date },
        endDate:     { type: Date },
        isCurrent:   { type: Boolean, default: false },
        description: { type: String, default: "" },
        _id: false,
      },
    ],

    education: [
      {
        institution:  { type: String, required: true },
        degree:       { type: String },
        fieldOfStudy: { type: String },
        startYear:    { type: Number },
        endYear:      { type: Number },
        _id: false,
      },
    ],

    certifications: [
      {
        name:          { type: String, required: true },
        issuer:        { type: String },
        issueDate:     { type: Date },
        credentialUrl: { type: String },
        _id: false,
      },
    ],

    // ── Stats ─────────────────────────────────────
    totalJobsPosted: { type: Number, default: 0 },
    totalHires:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

hrProfileSchema.methods.getCandidateLimit = function () {
  const limits = { free: 10, pro: 25, enterprise: Infinity };
  return limits[this.plan] ?? 10;
};

hrProfileSchema.methods.getJobPostLimit = function () {
  const limits = { free: 3, pro: 25, enterprise: Infinity };
  return limits[this.plan] ?? 3;
};

hrProfileSchema.index({ isVerified: 1 });
hrProfileSchema.index({ companyName: "text" });

module.exports = mongoose.model("HRProfile", hrProfileSchema);