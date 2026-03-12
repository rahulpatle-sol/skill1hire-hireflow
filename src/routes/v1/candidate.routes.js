const router = require("express").Router();
const { protect, authorizeRoles, isVerified } = require("../../middleware/auth.middleware");
const {
  getMyProfile, updateProfile, updateSkills,
  updateSocialLinks, getPublicProfile, submitCapstone, getScorecard,
} = require("../../controllers/candidate/candidate.controller");
const {
  getMyAssessments, getAssessmentById, submitAssessment,
} = require("../../controllers/candidate/assessment.controller");
const {
  getMyApplications, withdrawApplication, getJobFeed,
} = require("../../controllers/candidate/job.controller");

// Public
router.get("/public/:slug", getPublicProfile);

// Protected - any candidate
router.use(protect, authorizeRoles("candidate"));

router.get("/profile", getMyProfile);
router.put("/profile", updateProfile);
router.put("/skills", updateSkills);
router.put("/social-links", updateSocialLinks);
router.post("/capstone", submitCapstone);
router.get("/scorecard", getScorecard);

// Assessments
router.get("/assessments", getMyAssessments);
router.get("/assessments/:id", getAssessmentById);
router.post("/assessments/:id/submit", submitAssessment);

// Applications
router.get("/my-applications", getMyApplications);
router.delete("/applications/:id", withdrawApplication);

// Job feed — only verified candidates
router.get("/job-feed", isVerified, getJobFeed);

module.exports = router;
