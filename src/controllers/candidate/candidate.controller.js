const CandidateProfile = require("../../models/CandidateProfile.model");
const User = require("../../models/User.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { createUniqueSlug } = require("../../utils/slugify");

// @desc    Get own profile
// @route   GET /api/v1/candidate/profile
// @access  Private (candidate)
const getMyProfile = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id })
    .populate("user", "name email avatar isVerified")
    .populate("domains", "name slug")
    .populate("skills", "name slug domain");

  if (!profile) return next(new ApiError(404, "Profile not found"));
  res.json(new ApiResponse(200, { profile }));
});

// @desc    Update own profile
// @route   PUT /api/v1/candidate/profile
// @access  Private (candidate)
const updateProfile = asyncHandler(async (req, res, next) => {
  const {
    headline, bio, location, phone,
    education, experience, socialLinks,
  } = req.body;

  const profile = await CandidateProfile.findOne({ user: req.user._id });
  if (!profile) return next(new ApiError(404, "Profile not found"));

  if (headline !== undefined) profile.headline = headline;
  if (bio !== undefined) profile.bio = bio;
  if (location !== undefined) profile.location = location;
  if (phone !== undefined) profile.phone = phone;
  if (education !== undefined) profile.education = education;
  if (experience !== undefined) profile.experience = experience;
  if (socialLinks !== undefined) profile.socialLinks = socialLinks;

  // Generate public slug if not exists
  if (!profile.publicSlug) {
    profile.publicSlug = createUniqueSlug(req.user.name);
  }

  // Update profile completeness
  profile.profileCompleteness = calculateCompleteness(profile);
  await profile.save();

  res.json(new ApiResponse(200, { profile }, "Profile updated successfully"));
});

// @desc    Select skills and domains
// @route   PUT /api/v1/candidate/skills
// @access  Private (candidate)
const updateSkills = asyncHandler(async (req, res, next) => {
  const { skills, domains } = req.body;

  const profile = await CandidateProfile.findOne({ user: req.user._id });
  if (!profile) return next(new ApiError(404, "Profile not found"));

  if (skills) profile.skills = skills;
  if (domains) profile.domains = domains;

  profile.profileCompleteness = calculateCompleteness(profile);
  await profile.save();

  const updated = await CandidateProfile.findById(profile._id)
    .populate("skills", "name slug")
    .populate("domains", "name slug");

  res.json(new ApiResponse(200, { profile: updated }, "Skills updated successfully"));
});

// @desc    Update social links
// @route   PUT /api/v1/candidate/social-links
// @access  Private (candidate)
const updateSocialLinks = asyncHandler(async (req, res, next) => {
  const { linkedin, github, portfolio, twitter, leetcode } = req.body;

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    { socialLinks: { linkedin, github, portfolio, twitter, leetcode } },
    { new: true }
  );

  if (!profile) return next(new ApiError(404, "Profile not found"));
  res.json(new ApiResponse(200, { profile }, "Social links updated"));
});

// @desc    Get public profile by slug
// @route   GET /api/v1/candidate/public/:slug
// @access  Public
const getPublicProfile = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOne({
    publicSlug: req.params.slug,
    isProfilePublic: true,
  })
    .populate("user", "name avatar isVerified")
    .populate("domains", "name slug")
    .populate("skills", "name slug");

  if (!profile) return next(new ApiError(404, "Profile not found or not public"));
  res.json(new ApiResponse(200, { profile }));
});

// @desc    Submit capstone project
// @route   POST /api/v1/candidate/capstone
// @access  Private (candidate)
const submitCapstone = asyncHandler(async (req, res, next) => {
  const { title, description, repoUrl, liveUrl } = req.body;

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      capstoneProject: {
        title,
        description,
        repoUrl,
        liveUrl,
        submittedAt: new Date(),
        status: "pending_review",
      },
    },
    { new: true }
  );

  if (!profile) return next(new ApiError(404, "Profile not found"));
  res.json(new ApiResponse(200, { profile }, "Capstone project submitted for review"));
});

// @desc    Get scorecard
// @route   GET /api/v1/candidate/scorecard
// @access  Private (candidate)
const getScorecard = asyncHandler(async (req, res, next) => {
  const { AssessmentResult } = require("../../models/Assessment.model");

  const profile = await CandidateProfile.findOne({ user: req.user._id })
    .populate("skills", "name")
    .populate("domains", "name");

  if (!profile) return next(new ApiError(404, "Profile not found"));

  const results = await AssessmentResult.find({ candidate: req.user._id })
    .populate("assessment", "title domain skill level totalMarks")
    .sort("-completedAt");

  const scorecard = {
    overallScore: profile.overallScore,
    profileCompleteness: profile.profileCompleteness,
    isVerified: profile.isVerified,
    verifiedBadge: profile.verifiedBadge,
    verificationStatus: profile.verificationStatus,
    capstoneStatus: profile.capstoneProject?.status || "not_submitted",
    assessmentResults: results,
    totalAssessmentsPassed: results.filter((r) => r.isPassed).length,
    totalAssessmentsTaken: results.length,
  };

  res.json(new ApiResponse(200, { scorecard }));
});

// Helper: calculate profile completeness %
const calculateCompleteness = (profile) => {
  let score = 0;
  const fields = [
    profile.headline,
    profile.bio,
    profile.location,
    profile.phone,
    profile.skills?.length > 0,
    profile.domains?.length > 0,
    profile.education?.length > 0,
    profile.socialLinks?.linkedin,
    profile.resumeUrl,
    profile.capstoneProject?.status !== "not_submitted",
  ];
  fields.forEach((f) => { if (f) score += 10; });
  return score;
};

module.exports = {
  getMyProfile,
  updateProfile,
  updateSkills,
  updateSocialLinks,
  getPublicProfile,
  submitCapstone,
  getScorecard,
};
