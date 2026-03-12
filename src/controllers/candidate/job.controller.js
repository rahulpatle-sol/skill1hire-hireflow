const Job = require("../../models/Job.model");
const Application = require("../../models/Application.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// @desc    Search & list jobs (public — no auth needed)
// @route   GET /api/v1/jobs
// @access  Public
const getJobs = asyncHandler(async (req, res) => {
  const { search, domain, skills, workMode, jobType, experienceLevel, page = 1, limit = 12 } = req.query;

  const filter = { status: "active" };

  if (search) {
    filter.$text = { $search: search };
  }
  if (domain) filter.domain = domain;
  if (workMode) filter.workMode = workMode;
  if (jobType) filter.jobType = jobType;
  if (experienceLevel) filter.experienceLevel = experienceLevel;
  if (skills) {
    filter.requiredSkills = { $in: skills.split(",") };
  }

  const skip = (page - 1) * limit;
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate("domain", "name slug")
      .populate("requiredSkills", "name")
      .populate("postedBy", "name")
      .select("-requirements -responsibilities")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Job.countDocuments(filter),
  ]);

  // Increment view count
  const jobIds = jobs.map((j) => j._id);
  Job.updateMany({ _id: { $in: jobIds } }, { $inc: { totalViews: 1 } }).exec();

  res.json(
    new ApiResponse(200, {
      jobs,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    })
  );
});

// @desc    Get single job by slug (public)
// @route   GET /api/v1/jobs/:slug
// @access  Public
const getJobBySlug = asyncHandler(async (req, res, next) => {
  const job = await Job.findOne({ slug: req.params.slug, status: "active" })
    .populate("domain", "name slug")
    .populate("requiredSkills", "name")
    .populate("preferredSkills", "name")
    .populate("postedBy", "name");

  if (!job) return next(new ApiError(404, "Job not found"));

  await Job.findByIdAndUpdate(job._id, { $inc: { totalViews: 1 } });
  res.json(new ApiResponse(200, { job }));
});

// @desc    Apply to a job (verified candidates only)
// @route   POST /api/v1/jobs/:id/apply
// @access  Private (candidate, verified)
const applyToJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  if (!job || job.status !== "active") return next(new ApiError(404, "Job not found or closed"));

  // Check verification if required
  if (job.requiresVerification && !req.user.isVerified) {
    return next(
      new ApiError(403, "You must be verified (blue tick) to apply for this job")
    );
  }

  // Check existing application
  const existing = await Application.findOne({ job: job._id, candidate: req.user._id });
  if (existing) return next(new ApiError(409, "You have already applied for this job"));

  const candidateProfile = await CandidateProfile.findOne({ user: req.user._id });

  const application = await Application.create({
    job: job._id,
    candidate: req.user._id,
    candidateProfile: candidateProfile?._id,
    coverLetter: req.body.coverLetter || "",
    resumeUrl: req.body.resumeUrl || candidateProfile?.resumeUrl || "",
  });

  // Increment application count
  await Job.findByIdAndUpdate(job._id, { $inc: { totalApplications: 1 } });

  res.status(201).json(new ApiResponse(201, { application }, "Application submitted successfully"));
});

// @desc    Get candidate's own applications
// @route   GET /api/v1/jobs/my-applications
// @access  Private (candidate)
const getMyApplications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { candidate: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate({
        path: "job",
        populate: { path: "domain", select: "name" },
        select: "title slug jobType workMode location status jobId",
      })
      .sort("-appliedAt")
      .skip(skip)
      .limit(Number(limit)),
    Application.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { applications, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

// @desc    Withdraw an application
// @route   DELETE /api/v1/jobs/applications/:id
// @access  Private (candidate)
const withdrawApplication = asyncHandler(async (req, res, next) => {
  const application = await Application.findOne({
    _id: req.params.id,
    candidate: req.user._id,
  });
  if (!application) return next(new ApiError(404, "Application not found"));
  if (["hired", "offered"].includes(application.status)) {
    return next(new ApiError(400, "Cannot withdraw at this stage"));
  }

  application.status = "withdrawn";
  await application.save();
  res.json(new ApiResponse(200, null, "Application withdrawn"));
});

// @desc    Get skill-based job feed for verified candidates
// @route   GET /api/v1/jobs/feed
// @access  Private (candidate, verified)
const getJobFeed = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id });
  if (!profile) return next(new ApiError(404, "Profile not found"));

  const { page = 1, limit = 12 } = req.query;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find({
      status: "active",
      $or: [
        { requiredSkills: { $in: profile.skills } },
        { domain: { $in: profile.domains } },
      ],
    })
      .populate("domain", "name slug")
      .populate("requiredSkills", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Job.countDocuments({
      status: "active",
      $or: [
        { requiredSkills: { $in: profile.skills } },
        { domain: { $in: profile.domains } },
      ],
    }),
  ]);

  res.json(new ApiResponse(200, { jobs, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

module.exports = { getJobs, getJobBySlug, applyToJob, getMyApplications, withdrawApplication, getJobFeed };
