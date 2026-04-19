const User = require("../../models/User.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const HRProfile = require("../../models/HRProfile.model");
const MentorProfile = require("../../models/MentorProfile.model");
const { Domain, Skill } = require("../../models/Domain.model");
const { Assessment } = require("../../models/Assessment.model");
const Job = require("../../models/Job.model");
const Application = require("../../models/Application.model");
const Assignment = require("../../models/Assignment.model");
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
  // Support both formats:
  // { action: "verify" | "reject" }  OR  { isVerified: true/false }
  const { action, note, isVerified: isVerifiedParam, rejectionReason } = req.body;

  const user = await User.findById(req.params.userId);
  if (!user) return next(new ApiError(404, "User not found"));

  const isVerified = action ? action === "verify" : Boolean(isVerifiedParam);
  const noteText = note || rejectionReason || "";

  user.isVerified = isVerified;
  user.verifiedAt = isVerified ? new Date() : undefined;
  user.verifiedBy = req.user._id;
  await user.save({ validateBeforeSave: false });

  const verificationStatus = isVerified ? "verified" : "rejected";

  if (user.role === "candidate") {
    await CandidateProfile.findOneAndUpdate(
      { user: user._id },
      { isVerified, verifiedBadge: isVerified, verificationStatus, verificationNote: noteText },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else if (user.role === "hr") {
    await HRProfile.findOneAndUpdate(
      { user: user._id },
      { isVerified, verificationStatus, verificationNote: noteText, verifiedAt: isVerified ? new Date() : undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else if (user.role === "mentor") {
    await MentorProfile.findOneAndUpdate(
      { user: user._id },
      { isVerified, verificationStatus, verificationNote: noteText, verifiedAt: isVerified ? new Date() : undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const { enqueueEmail } = require("../../services/queue.service");
  const { generateProfileVerifiedEmail, generateProfileRejectedEmail } = require("../../utils/emails/admin.emails");

  if (enqueueEmail && isVerified) {
    enqueueEmail(user.email, "Profile Verified ✅", generateProfileVerifiedEmail(user.name, user.role)).catch(console.error);
  } else if (enqueueEmail && !isVerified) {
    enqueueEmail(user.email, "Verification Status Update", generateProfileRejectedEmail(user.name, noteText)).catch(console.error);
  }

  res.json(new ApiResponse(200, null, `User ${isVerified ? "verified ✅" : "rejected"} successfully`));
});

// ── List Pending Verifications ─────────────────────
// @route GET /api/v1/admin/pending/:role
const getPendingVerifications = asyncHandler(async (req, res, next) => {
  const { role } = req.params;
  const allowedRoles = ["candidate", "hr", "mentor"];
  if (!allowedRoles.includes(role)) return next(new ApiError(400, "Invalid role"));

  // Get users who are not verified
  const users = await User.find({ role, isVerified: false, isActive: true })
    .select("_id name email avatar createdAt")
    .sort("-createdAt");

  const userIds = users.map(u => u._id);

  // Fetch profiles based on role
  let pending = [];

  if (role === "candidate") {
    const profiles = await CandidateProfile.find({ user: { $in: userIds } })
      .populate("user", "name email avatar _id")
      .populate("skills", "name")
      .populate("domains", "name")
      .select("user headline bio overallScore totalAssessmentsPassed capstoneProject socialLinks profileCompleteness verificationStatus");
    pending = profiles;
  } else if (role === "hr") {
    const profiles = await HRProfile.find({ user: { $in: userIds } })
      .populate("user", "name email avatar _id")
      .select("user companyName companyWebsite designation bio verificationStatus");
    pending = profiles;
  } else if (role === "mentor") {
    const profiles = await MentorProfile.find({ user: { $in: userIds } })
      .populate("user", "name email avatar _id")
      .select("user bio currentRole currentCompany yearsOfExperience expertise avgRating verificationStatus");
    pending = profiles;
  }

  res.json(new ApiResponse(200, { pending, total: pending.length }));
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


// ── Assign Assessment to Candidate ───────────────
// @route PUT /api/v1/admin/assign-assessment/:candidateId
// @access Private (admin)
const assignAssessment = asyncHandler(async (req, res, next) => {
  const { assessmentIds } = req.body; // array of assessment _ids
  if (!Array.isArray(assessmentIds))
    return next(new ApiError(400, "assessmentIds must be an array"));

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.params.candidateId },
    { assignedAssessments: assessmentIds },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("assignedAssessments", "title domain level").populate("user", "name email");

  if (!profile) return next(new ApiError(404, "Candidate profile not found"));

  const { enqueueEmail } = require("../../services/queue.service");
  const { generateAssessmentAssignedEmail } = require("../../utils/emails/candidate.emails");
  if (enqueueEmail && profile.user && profile.user.email) {
    enqueueEmail(profile.user.email, "New Assessment Assigned", generateAssessmentAssignedEmail(profile.user.name, assessmentIds.length)).catch(console.error);
  }

  res.json(new ApiResponse(200, { profile }, "Assessments assigned successfully"));
});

// ── Remove Assigned Assessments ───────────────────
// @route DELETE /api/v1/admin/assign-assessment/:candidateId
// @access Private (admin)
const removeAssignedAssessments = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.params.candidateId },
    { assignedAssessments: [] },
    { new: true }
  );
  if (!profile) return next(new ApiError(404, "Candidate profile not found"));
  res.json(new ApiResponse(200, { profile }, "Assigned assessments removed"));
});

// ── Upgrade HR Plan ───────────────────────────────
// @route PUT /api/v1/admin/hr-plan/:userId
// @access Private (admin)
const upgradeHRPlan = asyncHandler(async (req, res, next) => {
  const { plan } = req.body;
  if (!["free","pro","enterprise"].includes(plan))
    return next(new ApiError(400, "Invalid plan: use free | pro | enterprise"));

  const profile = await HRProfile.findOneAndUpdate(
    { user: req.params.userId },
    { plan, planSince: new Date(), isPremium: plan !== "free" },
    { new: true }
  );
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }, `HR upgraded to ${plan}`));
});

// ── Get Full User Profile ─────────────────────────
// @route GET /api/v1/admin/users/:id/profile
const getUserFullProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ApiError(404, "User not found"));

  let profile = null;

  if (user.role === "candidate") {
    profile = await CandidateProfile.findOne({ user: user._id })
      .populate("skills", "name")
      .populate("domains", "name")
      .populate("assignedAssessments", "title domain level");
  } else if (user.role === "hr") {
    profile = await HRProfile.findOne({ user: user._id });
  } else if (user.role === "mentor") {
    profile = await MentorProfile.findOne({ user: user._id });
  }

  res.json(new ApiResponse(200, { user, profile }));
});

// ── Get Assessment Results for a User ─────────────
// @route GET /api/v1/admin/users/:id/assessment-results
const getUserAssessmentResults = asyncHandler(async (req, res, next) => {
  const { AssessmentResult } = require("../../models/Assessment.model");

  const results = await AssessmentResult.find({ candidate: req.params.id })
    .populate("assessment", "title domain level totalMarks passingMarks durationMinutes")
    .sort("-completedAt");

  res.json(new ApiResponse(200, { results, total: results.length }));
});

// ── Update Capstone Status ─────────────────────────
// @route PUT /api/v1/admin/users/:id/capstone-status
const updateCapstoneStatus = asyncHandler(async (req, res, next) => {
  const { status, feedback } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return next(new ApiError(400, "Invalid capstone status"));
  }

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.params.id },
    { 
      capstoneStatus: status,
      "capstoneProject.status": status,
      "capstoneProject.feedback": feedback 
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("user", "name email");

  if (!profile) return next(new ApiError(404, "Candidate profile not found"));

  const { enqueueEmail } = require("../../services/queue.service");
  const { generateCapstoneReviewEmail } = require("../../utils/emails/admin.emails");
  
  if (enqueueEmail && profile.user && profile.user.email) {
    enqueueEmail(profile.user.email, "Capstone Project Review Results", generateCapstoneReviewEmail(profile.user.name, status, feedback)).catch(console.error);
  }

  res.json(new ApiResponse(200, null, `Capstone project ${status}`));
});

// ── Get Analytics ───────────────────────────────
// @route GET /api/v1/admin/analytics
const getAnalytics = asyncHandler(async (req, res) => {
  const { AssessmentResult } = require("../../models/Assessment.model");

  const [
    totalJobs,
    totalHires, // Selected 
    totalApplications,
    shortlisted,
    rejected,
    interviewed,
    ongoingInterview,
    assessmentsCompleted,
    assignmentsGiven
  ] = await Promise.all([
    Job.countDocuments({ status: "active" }),
    Application.countDocuments({ status: "hired" }),
    Application.countDocuments(),
    Application.countDocuments({ status: "shortlisted" }),
    Application.countDocuments({ status: "rejected" }),
    Application.countDocuments({ status: "interview_done" }),
    Application.countDocuments({ status: "interview_scheduled" }),
    AssessmentResult.countDocuments(),
    Assignment.countDocuments()
  ]);

  const recentHires = await Application.find({ status: "hired" })
    .populate("candidate", "name email avatar")
    .populate("job", "title companyName")
    .sort("-updatedAt")
    .limit(10);

  res.json(new ApiResponse(200, {
    totalJobs,
    totalHires,
    totalApplications,
    shortlisted,
    rejected,
    interviewed,
    ongoingInterview,
    assessmentsCompleted,
    assignmentsGiven,
    recentHires
  }));
});

// ── Get All Capstones ─────────────────────────────
// @route GET /api/v1/admin/capstones
const getCapstones = asyncHandler(async (req, res) => {
  const profiles = await CandidateProfile.find({
    "capstoneProject.status": { $in: ["pending_review", "approved", "rejected"] }
  })
  .populate("user", "name email avatar isVerified")
  .select("user capstoneProject")
  .sort("-capstoneProject.submittedAt");

  res.json(new ApiResponse(200, { capstones: profiles }));
});

// ── Get All Sessions (Admin) ──────────────────────
const getAllSessions = asyncHandler(async (req, res) => {
  const MentorSession = require("../../models/MentorSession.model");
  const sessions = await MentorSession.find()
    .populate("mentor", "name email avatar")
    .populate("candidate", "name email avatar")
    .sort("-createdAt")
    .limit(100)
    .lean();
  res.json(new ApiResponse(200, { sessions }, "Sessions fetched"));
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
  assignAssessment,
  removeAssignedAssessments,
  upgradeHRPlan,
  getUserFullProfile,
  getUserAssessmentResults,
  updateCapstoneStatus,
  getAnalytics,
  getCapstones,
  getAllSessions,
};