const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../../middleware/auth.middleware");
const {
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
} = require("../../controllers/manager/manager.controller");

// ── Admin-only routes ─────────────────────────────
router.post("/create", protect, authorizeRoles("admin", "master"), createManager);
router.get("/", protect, authorizeRoles("admin", "master"), listManagers);
router.put("/:id", protect, authorizeRoles("admin", "master"), updateManager);
router.delete("/:id", protect, authorizeRoles("admin", "master"), deleteManager);

// ── Manager self-service routes ───────────────────
router.get("/me", protect, authorizeRoles("manager"), getMyProfile);
router.get("/my/candidates", protect, authorizeRoles("manager"), getMyCandidates);
router.get("/my/assignments", protect, authorizeRoles("manager"), getMyAssignments);
router.post("/assignment", protect, authorizeRoles("manager"), createAssignment);
router.put("/assignment/:id/score", protect, authorizeRoles("manager"), scoreAssignment);

// This must come AFTER /me and /my/* to avoid conflict
router.get("/:id", protect, authorizeRoles("admin", "master"), getManager);

module.exports = router;

