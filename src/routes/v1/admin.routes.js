const router = require("express").Router();
const {
  getDashboard,
  verifyUser,
  getPendingVerifications,
  createDomain, getDomains, updateDomain,
  createSkill, getSkills,
  createAssessment, getAssessments,
  getAllUsers, toggleUserActive,
  adminPostJob,
  assignAssessment, removeAssignedAssessments,
  upgradeHRPlan,
} = require("../../controllers/admin/admin.controller");

// Dashboard
router.get("/dashboard", getDashboard);

// Users
router.get("/users", getAllUsers);
router.put("/users/:id/toggle-active", toggleUserActive);

// Verification
router.put("/verify/:userId", verifyUser);
router.get("/pending/:role", getPendingVerifications);

// Domains
router.get("/domains", getDomains);
router.post("/domains", createDomain);
router.put("/domains/:id", updateDomain);

// Skills
router.get("/skills", getSkills);
router.post("/skills", createSkill);

// Assessments
router.get("/assessments", getAssessments);
router.post("/assessments", createAssessment);

// Assign assessment to specific candidate
router.put("/assign-assessment/:candidateId", assignAssessment);
router.delete("/assign-assessment/:candidateId", removeAssignedAssessments);

// Upgrade HR plan
router.put("/hr-plan/:userId", upgradeHRPlan);

// Admin post job
router.post("/jobs", adminPostJob);

module.exports = router;