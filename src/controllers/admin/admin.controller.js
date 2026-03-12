const User = require("../../models/User.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const HRProfile = require("../../models/HRProfile.model");
const MentorProfile = require("../../models/MentorProfile.model");
const { Domain, Skill } = require("../../models/Domain.model");
const { Assessment } = require("../../models/Assessment.model");
const Job = require("../../models/Job.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { createSlug } = require("../../utils/slugify");

// ── Dashboard Stats ───────────────────────────────
// @route GET /api/v1/admin/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalCandidates, totalHRs, totalMentors,
    verifiedCandidates, pendingCandidates,
    totalJobs, activeJobs, totalDomains,
  ] = await Promise.all([
    User.countDocuments({ role: "candidate" }),
    User.countDocuments({ role: "hr" }),
    User.countDocuments({ role: "mentor" }),
    User.countDocuments({ role: "candidate", isVerified: true }),
    CandidateProfile.countDocuments({ verificationStatus: "pending" }),
    Job.countDocuments(),
    Job.countDocuments({ status: "active" }),
    Domain.countDocuments({ isActive: true }),
  ]);

  res.json(
    new ApiResponse(200, {
      stats: {
        totalCandidates, totalHRs, totalMentors,
        verifiedCandidates, pendingCandidates,
        totalJobs, activeJobs, totalDomains,
      },
    })
  );
});

// ── Verify / Reject Users ─────────────────────────
// @route PUT /api/v1/admin/verify/:userId
const verifyUser = asyncHandler(async (req, res, next) => {
  const { action, note } = req.body; // action: "verify" | "reject"
  const user = await User.findById(req.params.userId);
  if (!user) return next(new ApiError(404, "User not found"));

  const isVerified = action === "verify";
  user.isVerified = isVerified;
  user.verifiedAt = isVerified ? new Date() : undefined;
  user.verifiedBy = req.user._id;
  await user.save({ validateBeforeSave: false });

  const verificationStatus = isVerified ? "verified" : "rejected";

  if (user.role === "candidate") {
    await CandidateProfile.findOneAndUpdate(
      { user: user._id },
      { isVerified, verifiedBadge: isVerified, verificationStatus, verificationNote: note || "" }
    );
  } else if (user.role === "hr") {
    await HRProfile.findOneAndUpdate(
      { user: user._id },
      { isVerified, verificationStatus, verificationNote: note || "", verifiedAt: isVerified ? new Date() : undefined }
    );
  } else if (user.role === "mentor") {
    await MentorProfile.findOneAndUpdate(
      { user: user._id },
      { isVerified, verificationStatus, verificationNote: note || "", verifiedAt: isVerified ? new Date() : undefined }
    );
  }

  res.json(new ApiResponse(200, null, `User ${isVerified ? "verified" : "rejected"} successfully`));
});

// ── List Pending Verifications ─────────────────────
// @route GET /api/v1/admin/pending/:role
const getPendingVerifications = asyncHandler(async (req, res, next) => {
  const { role } = req.params;
  const allowedRoles = ["candidate", "hr", "mentor"];
  if (!allowedRoles.includes(role)) return next(new ApiError(400, "Invalid role"));

  const users = await User.find({ role, isVerified: false, isActive: true })
    .select("name email avatar createdAt")
    .sort("-createdAt");

  res.json(new ApiResponse(200, { users, total: users.length }));
});

// ── Domains ───────────────────────────────────────
// @route POST /api/v1/admin/domains
const createDomain = asyncHandler(async (req, res, next) => {
  const { name, description, icon } = req.body;
  const slug = createSlug(name);

  const domain = await Domain.create({ name, slug, description, icon, createdBy: req.user._id });
  res.status(201).json(new ApiResponse(201, { domain }, "Domain created"));
});

// @route GET /api/v1/admin/domains
const getDomains = asyncHandler(async (req, res) => {
  const domains = await Domain.find().sort("name");
  res.json(new ApiResponse(200, { domains }));
});

// @route PUT /api/v1/admin/domains/:id
const updateDomain = asyncHandler(async (req, res, next) => {
  const domain = await Domain.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!domain) return next(new ApiError(404, "Domain not found"));
  res.json(new ApiResponse(200, { domain }, "Domain updated"));
});

// ── Skills ────────────────────────────────────────
// @route POST /api/v1/admin/skills
const createSkill = asyncHandler(async (req, res, next) => {
  const { name, domain, description } = req.body;
  const slug = createSlug(name);
  const skill = await Skill.create({ name, slug, domain, description, createdBy: req.user._id });
  res.status(201).json(new ApiResponse(201, { skill }, "Skill created"));
});

// @route GET /api/v1/admin/skills
const getSkills = asyncHandler(async (req, res) => {
  const { domain } = req.query;
  const filter = {};
  if (domain) filter.domain = domain;
  const skills = await Skill.find(filter).populate("domain", "name").sort("name");
  res.json(new ApiResponse(200, { skills }));
});

// ── Assessments ───────────────────────────────────
// @route POST /api/v1/admin/assessments
const createAssessment = asyncHandler(async (req, res) => {
  const assessment = await Assessment.create({ ...req.body, createdBy: req.user._id });

  // Auto-calculate total marks
  assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + q.marks, 0);
  assessment.passingMarks = Math.ceil(assessment.totalMarks * 0.6); // 60% pass
  await assessment.save();

  res.status(201).json(new ApiResponse(201, { assessment }, "Assessment created"));
});

// @route GET /api/v1/admin/assessments
const getAssessments = asyncHandler(async (req, res) => {
  const assessments = await Assessment.find()
    .populate("domain", "name")
    .populate("skill", "name")
    .sort("-createdAt");
  res.json(new ApiResponse(200, { assessments }));
});

// ── All Users ─────────────────────────────────────
// @route GET /api/v1/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, isVerified, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isVerified !== undefined) filter.isVerified = isVerified === "true";

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort("-createdAt").skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { users, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

// ── Deactivate User ───────────────────────────────
// @route PUT /api/v1/admin/users/:id/toggle-active
const toggleUserActive = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ApiError(404, "User not found"));
  if (user.role === "admin") return next(new ApiError(403, "Cannot deactivate admin"));

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  res.json(new ApiResponse(200, null, `User ${user.isActive ? "activated" : "deactivated"}`));
});

// ── Admin post job ────────────────────────────────
// @route POST /api/v1/admin/jobs
const adminPostJob = asyncHandler(async (req, res) => {
  const { createUniqueSlug } = require("../../utils/slugify");
  const slug = createUniqueSlug(req.body.title);
  const job = await Job.create({ ...req.body, slug, postedBy: req.user._id });
  res.status(201).json(new ApiResponse(201, { job }, "Job posted by admin"));
});

module.exports = {
  getDashboard,
  verifyUser,
  getPendingVerifications,
  createDomain,
  getDomains,
  updateDomain,
  createSkill,
  getSkills,
  createAssessment,
  getAssessments,
  getAllUsers,
  toggleUserActive,
  adminPostJob,
};
