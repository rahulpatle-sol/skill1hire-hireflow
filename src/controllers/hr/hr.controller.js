const HRProfile = require("../../models/HRProfile.model");
const Job = require("../../models/Job.model");
const Application = require("../../models/Application.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { createUniqueSlug } = require("../../utils/slugify");

// @desc    Get HR profile
// @route   GET /api/v1/hr/profile
// @access  Private (hr)
const getHRProfile = asyncHandler(async (req, res, next) => {
  const profile = await HRProfile.findOne({ user: req.user._id }).populate("user", "name email avatar");
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }));
});

// @desc    Update HR profile
// @route   PUT /api/v1/hr/profile
// @access  Private (hr)
const updateHRProfile = asyncHandler(async (req, res, next) => {
  const fields = ["companyName", "companyWebsite", "companyLogo", "companySize", "industry", "designation", "phone", "location", "bio"];
  const updates = {};
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const profile = await HRProfile.findOneAndUpdate({ user: req.user._id }, updates, { new: true, runValidators: true });
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }, "Profile updated"));
});

// @desc    Post a new job
// @route   POST /api/v1/hr/jobs
// @access  Private (hr, verified)
const postJob = asyncHandler(async (req, res, next) => {
  const {
    title, description, requirements, responsibilities,
    requiredSkills, preferredSkills, domain, jobType, workMode,
    experienceLevel, minExperience, maxExperience, location,
    salaryMin, salaryMax, salaryCurrency, isNegotiable, isSalaryHidden,
    applicationDeadline, totalOpenings, requiresVerification,
  } = req.body;

  const hrProfile = await HRProfile.findOne({ user: req.user._id });
  if (!hrProfile) return next(new ApiError(404, "HR profile not found"));

  const slug = createUniqueSlug(title);

  const job = await Job.create({
    title,
    slug,
    description,
    requirements,
    responsibilities,
    requiredSkills,
    preferredSkills,
    domain,
    jobType,
    workMode,
    experienceLevel,
    minExperience,
    maxExperience,
    location,
    salaryMin,
    salaryMax,
    salaryCurrency,
    isNegotiable,
    isSalaryHidden,
    applicationDeadline,
    totalOpenings,
    requiresVerification: requiresVerification !== undefined ? requiresVerification : true,
    postedBy: req.user._id,
    hrProfile: hrProfile._id,
  });

  // Update HR stats
  await HRProfile.findByIdAndUpdate(hrProfile._id, { $inc: { totalJobsPosted: 1 } });

  res.status(201).json(new ApiResponse(201, { job }, "Job posted successfully"));
});

// @desc    Get all jobs posted by this HR
// @route   GET /api/v1/hr/jobs
// @access  Private (hr)
const getMyJobs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { postedBy: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate("domain", "name")
      .populate("requiredSkills", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Job.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { jobs, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

// @desc    Update a job
// @route   PUT /api/v1/hr/jobs/:id
// @access  Private (hr)
const updateJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id });
  if (!job) return next(new ApiError(404, "Job not found"));

  const allowedUpdates = ["title", "description", "requirements", "responsibilities", "requiredSkills", "preferredSkills", "jobType", "workMode", "salaryMin", "salaryMax", "applicationDeadline", "totalOpenings", "status"];
  allowedUpdates.forEach((key) => { if (req.body[key] !== undefined) job[key] = req.body[key]; });
  await job.save();

  res.json(new ApiResponse(200, { job }, "Job updated"));
});

// @desc    Get applications for a job (with freemium limit + skill matching)
// @route   GET /api/v1/hr/jobs/:id/applications
// @access  Private (hr)
const getJobApplications = asyncHandler(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id })
    .populate("requiredSkills", "_id name")
    .populate("domain", "_id name");

  if (!job) return next(new ApiError(404, "Job not found"));

  // Get HR plan
  const hrProfile = await HRProfile.findOne({ user: req.user._id });
  const isPremium = hrProfile?.isPremium || false;

  // Free tier: 10 candidates, Premium: 20 candidates
  const FREE_LIMIT = 10;
  const PREMIUM_LIMIT = 20;

  const { status, page = 1 } = req.query;
  const filter = { job: job._id };
  if (status) filter.status = status;

  // ── Smart Matching ───────────────────────────
  // Pull ALL applications with candidate profiles
  const allApplications = await Application.find(filter)
    .populate("candidate", "name email avatar isVerified")
    .populate({
      path: "candidateProfile",
      populate: [
        { path: "skills", select: "_id name" },
        { path: "domains", select: "_id name" },
      ],
      select: "headline skills domains overallScore profileCompleteness socialLinks capstoneProject",
    })
    .sort({ "candidateProfile.overallScore": -1, appliedAt: -1 });

  // Score each application by skill match
  const jobSkillIds = (job.requiredSkills || []).map(s => s._id.toString());
  const jobDomainId = job.domain?._id?.toString();

  const scored = allApplications.map(app => {
    const candSkillIds = (app.candidateProfile?.skills || []).map(s => s._id.toString());
    const candDomainIds = (app.candidateProfile?.domains || []).map(d => d._id.toString());

    const skillMatches = jobSkillIds.filter(id => candSkillIds.includes(id)).length;
    const domainMatch = jobDomainId && candDomainIds.includes(jobDomainId) ? 1 : 0;

    const matchScore = jobSkillIds.length > 0
      ? Math.round(((skillMatches + domainMatch) / (jobSkillIds.length + 1)) * 100)
      : domainMatch ? 100 : 50;

    return { ...app.toObject(), matchScore };
  });

  // Sort by match score first
  scored.sort((a, b) => b.matchScore - a.matchScore);

  const total = scored.length;

  // Freemium: free = 10, premium = 20
  const visibleApplications = isPremium
    ? scored.slice((page - 1) * PREMIUM_LIMIT, page * PREMIUM_LIMIT)
    : scored.slice(0, FREE_LIMIT);

  const lockedCount = isPremium ? 0 : Math.max(0, total - FREE_LIMIT);

  res.json(new ApiResponse(200, {
    applications: visibleApplications,
    total,
    lockedCount,
    isPremium,
    freeLimit: FREE_LIMIT,
    page: Number(page),
    pages: isPremium ? Math.ceil(total / 10) : 1,
  }));
});

// @desc    Update application status
// @route   PUT /api/v1/hr/applications/:id
// @access  Private (hr)
const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status, hrNotes, rating, interviewDate, interviewLink, interviewType } = req.body;

  const application = await Application.findById(req.params.id).populate("job");
  if (!application) return next(new ApiError(404, "Application not found"));

  // Verify HR owns this job
  if (application.job.postedBy.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, "Not authorized"));
  }

  if (status) application.status = status;
  if (hrNotes !== undefined) application.hrNotes = hrNotes;
  if (rating !== undefined) application.rating = rating;
  if (interviewDate) application.interviewDate = interviewDate;
  if (interviewLink) application.interviewLink = interviewLink;
  if (interviewType) application.interviewType = interviewType;
  application.updatedBy = req.user._id;

  await application.save();
  res.json(new ApiResponse(200, { application }, "Application updated"));
});

// @desc    Upgrade HR to premium (admin only)
// @route   PUT /api/v1/hr/premium/:userId
// @access  Private (admin)
const upgradeHRToPremium = asyncHandler(async (req, res, next) => {
  const profile = await HRProfile.findOneAndUpdate(
    { user: req.params.userId },
    { isPremium: true, premiumSince: new Date() },
    { new: true }
  );
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }, "HR upgraded to premium"));
});

module.exports = {
  getHRProfile,
  updateHRProfile,
  postJob,
  getMyJobs,
  updateJob,
  getJobApplications,
  updateApplicationStatus,
  upgradeHRToPremium,
};