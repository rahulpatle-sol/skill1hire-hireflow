const router = require("express").Router();
const { protect, authorizeRoles, isVerified } = require("../../middleware/auth.middleware");
const { cacheMiddleware } = require("../../services/cache.service");
const {
  getJobs, getJobBySlug, applyToJob,
  getMyApplications, withdrawApplication, getJobFeed,
} = require("../../controllers/candidate/job.controller");

// Public
router.get("/", cacheMiddleware(300), getJobs);
router.get("/:slug", cacheMiddleware(300), getJobBySlug);

// Private
router.post("/:id/apply", protect, authorizeRoles("candidate"), applyToJob);

module.exports = router;
