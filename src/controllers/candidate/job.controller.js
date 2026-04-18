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

// @desc    Apply to a job
// @route   POST /api/v1/jobs/:id/apply
// @access  Private (candidate)
const applyToJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  if (!job || job.status !== "active") return next(new ApiError(404, "Job not found or closed"));

  // Unverified candidate — cannot apply to ANY job
  if (!req.user.isVerified) {
    return next(new ApiError(403, "VERIFICATION_REQUIRED"));
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

  await Job.findByIdAndUpdate(job._id, { $inc: { totalApplications: 1 } });

  // Push confirmation email to background queue
  const { enqueueEmail } = require("../../services/queue.service");
  const { generateApplicationReceivedEmail } = require("../../utils/emails/candidate.emails");

  if (enqueueEmail) {
    const html = generateApplicationReceivedEmail(req.user.name, job.title);
    enqueueEmail(req.user.email, `Application Confirmation: ${job.title}`, html).catch(console.error);

    // Notify the HR who posted this job
    const User = require("../../models/User.model");
    const { generateNewApplicationNotifyHR } = require("../../utils/emails/hr.emails");
    if (job.postedBy) {
      User.findById(job.postedBy).select("name email").lean()
        .then(hr => {
          if (hr && hr.email) {
            enqueueEmail(hr.email, `New Application: ${job.title}`, generateNewApplicationNotifyHR(hr.name, req.user.name, job.title)).catch(console.error);
            // Real-time notification to HR
            const { sendNotification } = require("../../services/notification.service");
            sendNotification(hr._id, {
              type: "new_application",
              title: "New Application!",
              message: `${req.user.name} applied for ${job.title}`,
              link: `/hr/jobs/${job._id}/applications`,
            });
          }
        })
        .catch(console.error);
    }
  }

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

// @desc    Smart skill-matched job feed for verified candidates
// @route   GET /api/v1/candidate/job-feed
// @access  Private (candidate, verified)
const getJobFeed = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id })
    .populate("skills", "_id name")
    .populate("domains", "_id name");

  if (!profile) return next(new ApiError(404, "Profile not found"));

  const { page = 1, limit = 12, search, workMode, jobType } = req.query;
  const skip = (page - 1) * limit;

  const candidateSkillIds = (profile.skills || []).map(s => s._id);
  const candidateDomainIds = (profile.domains || []).map(d => d._id);

  // Base filter — only active jobs
  const baseFilter = { status: "active" };
  if (search) baseFilter.$text = { $search: search };
  if (workMode) baseFilter.workMode = workMode;
  if (jobType) baseFilter.jobType = jobType;

  // If candidate has skills/domains — smart match
  // Otherwise show all active jobs
  const hasProfile = candidateSkillIds.length > 0 || candidateDomainIds.length > 0;

  const matchFilter = hasProfile
    ? {
        ...baseFilter,
        $or: [
          { requiredSkills: { $in: candidateSkillIds } },
          { domain: { $in: candidateDomainIds } },
        ],
      }
    : baseFilter;

  const [rawJobs, total] = await Promise.all([
    Job.find(matchFilter)
      .populate("domain", "name slug")
      .populate("requiredSkills", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Job.countDocuments(matchFilter),
  ]);

  // Attach match score to each job
  const jobs = rawJobs.map(job => {
    const jobSkillIds = (job.requiredSkills || []).map(s => s._id.toString());
    const jobDomainId = job.domain?._id?.toString();

    const candSkillStrs = candidateSkillIds.map(id => id.toString());
    const candDomainStrs = candidateDomainIds.map(id => id.toString());

    const skillMatches = jobSkillIds.filter(id => candSkillStrs.includes(id)).length;
    const domainMatch = jobDomainId && candDomainStrs.includes(jobDomainId) ? 1 : 0;

    const matchScore = jobSkillIds.length > 0
      ? Math.round(((skillMatches + domainMatch) / (jobSkillIds.length + 1)) * 100)
      : domainMatch ? 100 : 70;

    return { ...job.toObject(), matchScore, isSmartMatch: matchScore >= 60 };
  });

  // Sort by match score
  jobs.sort((a, b) => b.matchScore - a.matchScore);

  res.json(new ApiResponse(200, { jobs, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

module.exports = { getJobs, getJobBySlug, applyToJob, getMyApplications, withdrawApplication, getJobFeed };