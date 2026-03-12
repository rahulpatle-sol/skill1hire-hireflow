const passport = require("passport");
const ApiError = require("../utils/ApiError");

// Protect route — JWT required
const protect = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err || !user) {
      return next(new ApiError(401, "Unauthorized — please login"));
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Role-based access
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Required role: ${roles.join(" or ")}`)
      );
    }
    next();
  };
};

// Only verified candidates can access job feed & apply
const isVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return next(
      new ApiError(
        403,
        "Profile not verified yet. Complete your assessments and capstone project to get verified."
      )
    );
  }
  next();
};

// HR must be verified to post jobs
const isHRVerified = async (req, res, next) => {
  try {
    const HRProfile = require("../models/HRProfile.model");
    const profile = await HRProfile.findOne({ user: req.user._id });
    if (!profile || !profile.isVerified) {
      return next(
        new ApiError(403, "HR profile not verified. Please wait for admin approval.")
      );
    }
    req.hrProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, authorizeRoles, isVerified, isHRVerified };
