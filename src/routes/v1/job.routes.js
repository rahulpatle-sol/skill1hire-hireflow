const router = require("express").Router();
const { protect, authorizeRoles, isVerified } = require("../../middleware/auth.middleware");
const {
  getJobs, getJobBySlug, applyToJob,
  getMyApplications, withdrawApplication, getJobFeed,
} = require("../../controllers/candidate/job.controller");

// Public
router.get("/", getJobs);
router.get("/:slug", getJobBySlug);

// Private
router.post("/:id/apply", protect, authorizeRoles("candidate"), applyToJob);

module.exports = router;
