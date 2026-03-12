const router = require("express").Router();
const { protect, authorizeRoles } = require("../../middleware/auth.middleware");
const {
  getMentorProfile, updateMentorProfile, getAllMentors,
  bookSession, getMentorSessions, updateSession, rateSession,
} = require("../../controllers/mentor/mentor.controller");

// Public
router.get("/", getAllMentors);

// Candidate books a mentor
router.post("/:mentorId/book", protect, authorizeRoles("candidate"), bookSession);

// Rate a session (candidate)
router.post("/sessions/:id/rate", protect, authorizeRoles("candidate"), rateSession);

// Mentor-only routes
router.use(protect, authorizeRoles("mentor"));
router.get("/profile", getMentorProfile);
router.put("/profile", updateMentorProfile);
router.get("/sessions", getMentorSessions);
router.put("/sessions/:id", updateSession);

module.exports = router;
