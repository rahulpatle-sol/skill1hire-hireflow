const router = require("express").Router();
const passport = require("passport");
const { body } = require("express-validator");
const {
  register, login, googleCallback, refreshToken,
  logout, verifyEmail, forgotPassword, resetPassword, getMe,
} = require("../../controllers/auth/auth.controller");
const { protect } = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");

// ── Validators ────────────────────────────────────
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 8 }).withMessage("Password min 8 chars"),
  body("role").optional().isIn(["candidate", "hr", "mentor"]),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

// ── Routes ────────────────────────────────────────
router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", protect, logout);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", body("email").isEmail(), validate, forgotPassword);
router.post("/reset-password/:token",
  body("password").isLength({ min: 8 }),
  validate,
  resetPassword
);
router.get("/me", protect, getMe);

// ── Google OAuth ──────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  googleCallback
);

module.exports = router;
