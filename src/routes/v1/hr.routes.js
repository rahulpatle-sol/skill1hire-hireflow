const router = require("express").Router();
const { protect, authorizeRoles, isHRVerified } = require("../../middleware/auth.middleware");
const {
  getHRProfile, updateHRProfile, postJob,
  getMyJobs, updateJob, getJobApplications, updateApplicationStatus,
  addHRExperience, deleteHRExperience,
  addHREducation, deleteHREducation,
  addHRCertification, deleteHRCertification,
} = require("../../controllers/hr/hr.controller");

router.use(protect, authorizeRoles("hr"));

router.get("/profile", getHRProfile);
router.put("/profile", updateHRProfile);

// ── LinkedIn-style profile sections ──────────────
router.post("/profile/experience",         addHRExperience);
router.delete("/profile/experience/:expId", deleteHRExperience);
router.post("/profile/education",          addHREducation);
router.delete("/profile/education/:eduId", deleteHREducation);
router.post("/profile/certification",          addHRCertification);
router.delete("/profile/certification/:certId", deleteHRCertification);

// Jobs - must be verified HR
router.post("/jobs", isHRVerified, postJob);
router.get("/jobs", getMyJobs);
router.put("/jobs/:id", isHRVerified, updateJob);
router.get("/jobs/:id/applications", getJobApplications);
router.put("/applications/:id", updateApplicationStatus);

module.exports = router;

