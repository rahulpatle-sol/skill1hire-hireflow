const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      unique: true,
      default: () => `JOB-${uuidv4().split("-")[0].toUpperCase()}`,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hrProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HRProfile",
    },
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: 200,
    },
    slug: { type: String, unique: true },
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    requirements: [{ type: String }],
    responsibilities: [{ type: String }],
    requiredSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
    preferredSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
    domain: { type: mongoose.Schema.Types.ObjectId, ref: "Domain" },

    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship", "freelance"],
      default: "full-time",
    },
    workMode: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "onsite",
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "junior", "mid", "senior", "lead", "manager"],
      default: "entry",
    },
    minExperience: { type: Number, default: 0 },
    maxExperience: { type: Number, default: 0 },

    location: { type: String, default: "" },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    salaryCurrency: { type: String, default: "INR" },
    isNegotiable: { type: Boolean, default: false },
    isSalaryHidden: { type: Boolean, default: false },

    applicationDeadline: { type: Date },
    totalOpenings: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ["draft", "active", "paused", "closed", "expired"],
      default: "active",
    },

    // Access control — only verified candidates can apply
    requiresVerification: { type: Boolean, default: true },

    totalApplications: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// slug and jobId are already indexed via unique:true on the fields
jobSchema.index({ postedBy: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ domain: 1 });
jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ workMode: 1, jobType: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Job", jobSchema);
