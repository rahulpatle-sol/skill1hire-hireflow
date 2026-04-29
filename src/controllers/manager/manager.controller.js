const User = require("../../models/User.model");
const ManagerProfile = require("../../models/ManagerProfile.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const Assessment = require("../../models/Assessment.model");
const Assignment = require("../../models/Assignment.model");
const { Domain } = require("../../models/Domain.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const {
  sendAssignmentEmail,
  sendScorecardUpdateEmail,
} = require("../../utils/email");

// ── Admin: Create a Manager ───────────────────────
// POST /api/v1/manager/create
const createManager = asyncHandler(async (req, res, next) => {
  const { userId, domains, title, permissions } = req.body;

  const target = await User.findById(userId);
  if (!target) return next(new ApiError(404, "User not found"));

  // Promote role to manager
  target.role = "manager";
  await target.save({ validateBeforeSave: false });

  const existing = await ManagerProfile.findOne({ user: userId });
  if (existing) {
    // Update domains if manager already exists
    if (domains) existing.domains = domains;
    if (title) existing.title = title;
    if (permissions) existing.permissions = { ...existing.permissions, ...permissions };
    existing.createdBy = req.user._id;
    await existing.save();
    return res.status(200).json(new ApiResponse(200, { manager: existing }, "Manager updated"));
  }

  const manager = await ManagerProfile.create({
    user: userId,
    createdBy: req.user._id,
    domains: domains || [],
    title: title || "Domain Manager",
    permissions: permissions || {},
  });

  res.status(201).json(new ApiResponse(201, { manager }, "Manager created successfully"));
});

// ── Admin: List all Managers ──────────────────────
// GET /api/v1/manager
const listManagers = asyncHandler(async (req, res) => {
  const managers = await ManagerProfile.find()
    .populate("user", "name email avatar isVerified lastLogin")
    .populate("domains", "name")
    .populate("createdBy", "name email");

  res.json(new ApiResponse(200, { managers, total: managers.length }));
});

// ── Admin: Get a single Manager ───────────────────
// GET /api/v1/manager/:id
const getManager = asyncHandler(async (req, res, next) => {
  const manager = await ManagerProfile.findById(req.params.id)
    .populate("user", "name email avatar isVerified lastLogin createdAt")
    .populate("domains", "name description")
    .populate("createdBy", "name email");

  if (!manager) return next(new ApiError(404, "Manager not found"));
  res.json(new ApiResponse(200, { manager }));
});

// ── Admin: Update manager permissions/domains ─────
// PUT /api/v1/manager/:id
const updateManager = asyncHandler(async (req, res, next) => {
  const { domains, title, permissions, isActive } = req.body;
  const manager = await ManagerProfile.findById(req.params.id);
  if (!manager) return next(new ApiError(404, "Manager not found"));

  if (domains !== undefined) manager.domains = domains;
  if (title !== undefined) manager.title = title;
  if (permissions !== undefined) manager.permissions = { ...manager.permissions, ...permissions };
  if (isActive !== undefined) manager.isActive = isActive;

  await manager.save();
  res.json(new ApiResponse(200, { manager }, "Manager updated"));
});

// ── Admin: Delete a Manager ───────────────────────
// DELETE /api/v1/manager/:id
const deleteManager = asyncHandler(async (req, res, next) => {
  const manager = await ManagerProfile.findById(req.params.id);
  if (!manager) return next(new ApiError(404, "Manager not found"));

  // Demote back to candidate
  await User.findByIdAndUpdate(manager.user, { role: "candidate" });
  await manager.deleteOne();

  res.json(new ApiResponse(200, {}, "Manager removed and role reverted to candidate"));
});

// ── Manager: Get candidates in their domains ──────
// GET /api/v1/manager/my/candidates
const getMyCandidates = asyncHandler(async (req, res, next) => {
  const managerProfile = await ManagerProfile.findOne({ user: req.user._id });
  if (!managerProfile) return next(new ApiError(403, "Not a manager"));

  const candidates = await CandidateProfile.find({
    domains: { $in: managerProfile.domains },
  })
    .populate("user", "name email avatar isVerified createdAt lastLogin")
    .sort({ overallScore: -1 });

  res.json(new ApiResponse(200, { candidates, total: candidates.length }));
});

// ── Manager: Create Assignment for candidate ──────
// POST /api/v1/manager/assignment
const createAssignment = asyncHandler(async (req, res, next) => {
  const managerProfile = await ManagerProfile.findOne({ user: req.user._id });
  if (!managerProfile || !managerProfile.permissions.canCreateAssignment)
    return next(new ApiError(403, "Permission denied"));

  const { title, description, candidateId, domainId, dueDate, githubRequired } = req.body;

  // Validate domain scope
  const domainAllowed = managerProfile.domains.some(d => d.toString() === domainId);
  if (!domainAllowed) return next(new ApiError(403, "Domain not in your scope"));

  const candidate = await User.findById(candidateId).select("name email");
  if (!candidate) return next(new ApiError(404, "Candidate not found"));

  const assignment = await Assignment.create({
    title,
    description,
    domain: domainId,
    assignedTo: candidateId,
    assignedBy: req.user._id,
    dueDate,
    githubRequired: githubRequired || false,
  });

  // Auto-send email notification
  try {
    const dashboardUrl = `${process.env.CLIENT_URL}/candidate/dashboard`;
    await sendAssignmentEmail(
      candidate.email,
      candidate.name,
      title,
      dueDate,
      dashboardUrl
    );
  } catch (e) {
    console.error("Assignment email failed:", e.message);
  }

  res.status(201).json(new ApiResponse(201, { assignment }, "Assignment created and candidate notified"));
});

// ── Manager: Score an Assignment and update scorecard ─
// PUT /api/v1/manager/assignment/:id/score
const scoreAssignment = asyncHandler(async (req, res, next) => {
  const { score, feedback } = req.body;
  const managerProfile = await ManagerProfile.findOne({ user: req.user._id });
  if (!managerProfile || !managerProfile.permissions.canScoreAssignment)
    return next(new ApiError(403, "Permission denied"));

  const assignment = await Assignment.findById(req.params.id)
    .populate("assignedTo", "name email");
  if (!assignment) return next(new ApiError(404, "Assignment not found"));

  assignment.score = score;
  assignment.feedback = feedback || "";
  assignment.status = "reviewed";
  await assignment.save();

  // Update candidate scorecard
  const profile = await CandidateProfile.findOne({ user: assignment.assignedTo._id });
  if (profile) {
    // Update assignment score and recalculate overall
    profile.totalAssignmentsCompleted += 1;
    await recalculateScorecard(profile);
  }

  // Send email notification to candidate
  try {
    await sendScorecardUpdateEmail(
      assignment.assignedTo.email,
      assignment.assignedTo.name,
      { assignmentTitle: assignment.title, score, feedback }
    );
  } catch (e) {
    console.error("Score email failed:", e.message);
  }

  res.json(new ApiResponse(200, { assignment }, "Assignment scored and candidate notified"));
});

// ── Manager: List assignments for their domain ────
// GET /api/v1/manager/my/assignments
const getMyAssignments = asyncHandler(async (req, res, next) => {
  const managerProfile = await ManagerProfile.findOne({ user: req.user._id });
  if (!managerProfile) return next(new ApiError(403, "Not a manager"));

  const assignments = await Assignment.find({
    assignedBy: req.user._id,
  })
    .populate("assignedTo", "name email avatar")
    .populate("domain", "name")
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, { assignments, total: assignments.length }));
});

// ── Manager: Get My Profile ───────────────────────
// GET /api/v1/manager/me
const getMyProfile = asyncHandler(async (req, res, next) => {
  const manager = await ManagerProfile.findOne({ user: req.user._id })
    .populate("domains", "name description")
    .populate("createdBy", "name email");

  if (!manager) return next(new ApiError(404, "Manager profile not found"));
  res.json(new ApiResponse(200, { manager }));
});

// ── Internal: Recalculate overall score ──────────
async function recalculateScorecard(profile) {
  const assignments = await Assignment.find({
    assignedTo: profile.user,
    status: "reviewed",
    score: { $gt: 0 },
  });

  let assignmentAvg = 0;
  if (assignments.length > 0) {
    assignmentAvg = assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length;
  }

  // Weighted formula: 40% assessments + 40% assignments + 20% profile completeness
  const assessmentScore = profile.assessmentScore || 0;
  const completeness = profile.profileCompleteness || 0;
  const totalAssignmentsCompleted = assignments.length;

  profile.totalAssignmentsCompleted = totalAssignmentsCompleted;
  profile.overallScore = Math.round(
    assessmentScore * 0.4 + assignmentAvg * 0.4 + completeness * 0.2
  );

  await profile.save({ validateBeforeSave: false });
  return profile;
}

module.exports = {
  createManager,
  listManagers,
  getManager,
  updateManager,
  deleteManager,
  getMyCandidates,
  createAssignment,
  scoreAssignment,
  getMyAssignments,
  getMyProfile,
};
