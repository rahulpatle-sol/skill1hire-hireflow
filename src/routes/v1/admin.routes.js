const router = require("express").Router();
const { protect, authorizeRoles } = require("../../middleware/auth.middleware");
const {
  getDashboard, verifyUser, getPendingVerifications,
  createDomain, getDomains, updateDomain,
  createSkill, getSkills,
  createAssessment, getAssessments,
  getAllUsers, toggleUserActive, adminPostJob,
} = require("../../controllers/admin/admin.controller");

router.use(protect, authorizeRoles("admin"));

// Dashboard
router.get("/dashboard", getDashboard);

// Users
router.get("/users", getAllUsers);
router.put("/users/:id/toggle-active", toggleUserActive);
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

// Jobs
router.post("/jobs", adminPostJob);

module.exports = router;
