const router = require("express").Router();
const { protect, authorizeRoles } = require("../../middleware/auth.middleware"); // ← path check karo
const {
  getDashboard, verifyUser, getPendingVerifications,
  createDomain, getDomains, updateDomain,
  createSkill, getSkills,
  createAssessment, getAssessments,
  getAllUsers, toggleUserActive,
  adminPostJob, assignAssessment, removeAssignedAssessments, upgradeHRPlan,
  getUserFullProfile, getUserAssessmentResults, updateCapstoneStatus,
  getAnalytics, getCapstones, getAllSessions
} = require("../../controllers/admin/admin.controller");

// ── All admin routes protected ────────────────────
router.use(protect, authorizeRoles("admin")); // ← fix

router.get("/dashboard", getDashboard);
router.get("/analytics", getAnalytics);
router.get("/capstones", getCapstones);
router.get("/users", getAllUsers);
router.get("/users/:id/profile", getUserFullProfile);
router.get("/users/:id/assessment-results", getUserAssessmentResults);
router.put("/users/:id/toggle-active", toggleUserActive);
router.put("/users/:id/capstone-status", updateCapstoneStatus);
router.put("/verify/:userId", verifyUser);
router.get("/pending/:role", getPendingVerifications);
router.get("/domains", getDomains);
router.post("/domains", createDomain);
router.put("/domains/:id", updateDomain);
router.get("/skills", getSkills);
router.post("/skills", createSkill);
router.get("/assessments", getAssessments);
router.post("/assessments", createAssessment);
router.put("/assign-assessment/:candidateId", assignAssessment);
router.delete("/assign-assessment/:candidateId", removeAssignedAssessments);
router.put("/hr-plan/:userId", upgradeHRPlan);
router.post("/jobs", adminPostJob);
router.get("/sessions", getAllSessions);

module.exports = router;