const crypto = require("crypto");
const User = require("../../models/User.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const HRProfile = require("../../models/HRProfile.model");
const MentorProfile = require("../../models/MentorProfile.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { generateTokenPair, generateAccessToken } = require("../../utils/generateToken");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../../utils/email");
const jwt = require("jsonwebtoken");

// Helper: create profile based on role
const createProfileForRole = async (userId, role) => {
  if (role === "candidate") {
    await CandidateProfile.create({ user: userId });
  } else if (role === "hr") {
    await HRProfile.create({ user: userId, companyName: "Not set" });
  } else if (role === "mentor") {
    await MentorProfile.create({ user: userId });
  }
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const allowedRoles = ["candidate", "hr", "mentor"];
  if (role && !allowedRoles.includes(role)) {
    return next(new ApiError(400, "Invalid role"));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(new ApiError(409, "Email already registered"));

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || "candidate",
    emailVerifyToken: verifyToken,
    emailVerifyExpiry: verifyExpiry,
  });

  // Create role-specific profile (wrap individually so we see which one fails)
  try {
    await createProfileForRole(user._id, user.role);
  } catch (profileErr) {
    console.error("❌ Profile creation failed:", profileErr.message);
    // Don't block registration if profile fails — just log it
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user._id.toString(), user.role);

  // Save refresh token
  await User.findByIdAndUpdate(user._id, { refreshToken }, { new: true });

  // Send verification email (non-blocking, best effort)
  sendVerificationEmail(email, name, verifyToken).catch((err) =>
    console.error("📧 Email send failed (non-critical):", err.message)
  );

  // Build clean response (avoid select:false field exposure)
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };

  res.status(201).json(
    new ApiResponse(
      201,
      { user: userResponse, accessToken, refreshToken },
      "Registered successfully. Please verify your email."
    )
  );
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) return next(new ApiError(401, "Invalid email or password"));

  if (user.authProvider === "google") {
    return next(new ApiError(400, "Please login with Google"));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(new ApiError(401, "Invalid email or password"));

  if (!user.isActive) return next(new ApiError(403, "Account is deactivated"));

  const { accessToken, refreshToken } = generateTokenPair(user._id.toString(), user.role);

  await User.findByIdAndUpdate(user._id, { refreshToken, lastLogin: new Date() });

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isVerified: user.isVerified,
  };

  res.json(
    new ApiResponse(200, { user: userResponse, accessToken, refreshToken }, "Login successful")
  );
});

// @desc    Google OAuth callback
// @route   GET /api/v1/auth/google/callback
// @access  Public
const googleCallback = asyncHandler(async (req, res) => {
  const user = req.user;
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Redirect to frontend with tokens
  res.redirect(
    `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`
  );
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;
  if (!token) return next(new ApiError(400, "Refresh token required"));

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new ApiError(401, "Invalid or expired refresh token"));
  }

  const user = await User.findById(payload.id).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    return next(new ApiError(401, "Refresh token mismatch — please login again"));
  }

  const newAccess = generateAccessToken(user._id.toString(), user.role);
  res.json(new ApiResponse(200, { accessToken: newAccess }, "Token refreshed"));
});

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json(new ApiResponse(200, null, "Logged out successfully"));
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({
    emailVerifyToken: req.params.token,
    emailVerifyExpiry: { $gt: Date.now() },
  });

  if (!user) return next(new ApiError(400, "Invalid or expired verification link"));

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  res.json(new ApiResponse(200, null, "Email verified successfully"));
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new ApiError(404, "No account with this email"));

  const resetToken = crypto.randomBytes(32).toString("hex");

  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: resetToken,
    resetPasswordExpiry: new Date(Date.now() + 60 * 60 * 1000),
  });

  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (err) {
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: undefined,
      resetPasswordExpiry: undefined,
    });
    return next(new ApiError(500, "Failed to send reset email. Check your SMTP config."));
  }

  res.json(new ApiResponse(200, null, "Password reset email sent"));
});

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) return next(new ApiError(400, "Invalid or expired reset link"));

  // Use save here because bcrypt pre-save hook needs to hash the new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  res.json(new ApiResponse(200, null, "Password reset successfully. Please login."));
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, { user: req.user }, "User fetched"));
});

module.exports = {
  register,
  login,
  googleCallback,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
};
