const HRProfile   = require("../../models/HRProfile.model");
const Job         = require("../../models/Job.model");
const Application = require("../../models/Application.model");
const ApiError    = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { createUniqueSlug } = require("../../utils/slugify");
const { Domain } = require("../../models/Domain.model");

const PLAN_LIMITS = { free: 10, pro: 25, enterprise: Infinity };

const getHRProfile = asyncHandler(async (req, res, next) => {
  const profile = await HRProfile.findOne({ user: req.user._id }).populate("user", "name email avatar");
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }));
});

const updateHRProfile = asyncHandler(async (req, res, next) => {
  const allowed = ["companyName","companyWebsite","companyLogo","companySize","industry","designation","phone","location","bio"];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const profile = await HRProfile.findOneAndUpdate({ user: req.user._id }, updates, { new: true, runValidators: true });
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }, "Profile updated"));
});

const postJob = asyncHandler(async (req, res, next) => {
  const hrProfile = await HRProfile.findOne({ user: req.user._id });
  if (!hrProfile) return next(new ApiError(404, "HR profile not found"));

  // Enforce job posting limits
  const jobLimit = hrProfile.getJobPostLimit();
  if (hrProfile.totalJobsPosted >= jobLimit) {
    return next(new ApiError(403, `You've reached the ${hrProfile.plan} plan limit (${jobLimit} jobs). Upgrade to post more jobs.`));
  }

  const slug = createUniqueSlug(req.body.title);
  
  let domainId = req.body.domain;
  if (domainId && !domainId.match(/^[0-9a-fA-F]{24}$/)) {
    // If not an ObjectId, treat it as a new domain name
    let dSlug = createUniqueSlug(domainId);
    let existingDomain = await Domain.findOne({ slug: dSlug });
    if (!existingDomain) {
      existingDomain = await Domain.create({ 
        name: domainId, 
        slug: dSlug, 
        createdBy: req.user._id,
        description: "Created by HR during job posting" 
      });
    }
    domainId = existingDomain._id;
  }

  const job = await Job.create({
    ...req.body,
    domain: domainId || undefined,
    slug,
    salaryRange: {
      min: req.body.salaryRange?.min || (req.body.salaryMin ? req.body.salaryMin * 100000 : 0),
      max: req.body.salaryRange?.max || (req.body.salaryMax ? req.body.salaryMax * 100000 : 0),
      currency: "INR",
    },
    isExternalJob: req.body.isExternalJob === true || req.body.isExternalJob === "true",
    externalCompanyName: req.body.externalCompanyName,
    externalCompanyLogo: req.body.externalCompanyLogo,
    externalCompanyWebsite: req.body.externalCompanyWebsite,
    externalApplyLink: req.body.externalApplyLink,
    requiresVerification: req.body.requiresVerification === true || req.body.requiresVerification === "true",
    company: req.body.isExternalJob ? req.body.externalCompanyName : (req.body.company || hrProfile.companyName),
    postedBy: req.user._id,
    status: "active",
  });

  await HRProfile.findOneAndUpdate({ user: req.user._id }, { $inc: { totalJobsPosted: 1 } });

  const { enqueueEmail } = require("../../services/queue.service");
  const { generateHRJobPostedEmail } = require("../../utils/emails/hr.emails");
  if (enqueueEmail && req.user.email) {
    enqueueEmail(req.user.email, "Job Successfully Posted on Skill1 Hire", generateHRJobPostedEmail(hrProfile.companyName || req.user.name, job.title)).catch(console.error);
  }

  // Broadcast new job alert to all verified candidates (async, non-blocking)
  if (enqueueEmail) {
    const User = require("../../models/User.model");
    const { generateNewJobAlertEmail } = require("../../utils/emails/candidate.emails");
    User.find({ role: "candidate", isVerified: true, isLocked: { $ne: true } }).select("name email").lean()
      .then(candidates => {
        candidates.forEach(c => {
          enqueueEmail(c.email, `New Job: ${job.title}`, generateNewJobAlertEmail(c.name, job.title, job.company || hrProfile.companyName)).catch(console.error);
        });
      })
      .catch(console.error);
  }

  // Real-time notification to all candidates
  const { notifyRole } = require("../../services/notification.service");
  notifyRole("candidate", {
    type: "new_job",
    title: "New Job Available!",
    message: `${job.title} at ${job.company || hrProfile.companyName}`,
    link: `/jobs/${job.slug || job._id}`,
  }).catch(console.error);

  res.status(201).json(new ApiResponse(201, { job }, "Job posted successfully"));
});

const getMyJobs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { postedBy: req.user._id };
  if (status) filter.status = status;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find(filter).populate("domain", "name").populate("requiredSkills", "name").sort("-createdAt").skip(skip).limit(Number(limit)),
    Job.countDocuments(filter),
  ]);

  const jobIds = jobs.map(j => j._id);
  const appCounts = await Application.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: "$job", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  appCounts.forEach(a => { countMap[a._id.toString()] = a.count; });

  const enriched = jobs.map(j => ({ ...j.toObject(), applicationsCount: countMap[j._id.toString()] || 0 }));
  res.json(new ApiResponse(200, { jobs: enriched, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

const updateJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id });
  if (!job) return next(new ApiError(404, "Job not found"));
  const allowed = ["title","description","requirements","responsibilities","requiredSkills","preferredSkills","jobType","workMode","salaryRange","applicationDeadline","totalOpenings","status"];
  allowed.forEach(k => { if (req.body[k] !== undefined) job[k] = req.body[k]; });
  await job.save();
  res.json(new ApiResponse(200, { job }, "Job updated"));
});

const getJobApplications = asyncHandler(async (req, res, next) => {
  const job = await Job.findOne({ _id: req.params.id, postedBy: req.user._id })
    .populate("requiredSkills", "_id name")
    .populate("domain", "_id name");
  if (!job) return next(new ApiError(404, "Job not found"));

  const hrProfile = await HRProfile.findOne({ user: req.user._id });
  const plan      = hrProfile?.plan || "free";
  const limit     = PLAN_LIMITS[plan] ?? 10;

  const { status, page = 1 } = req.query;
  const filter = { job: job._id };
  if (status) filter.status = status;

  const all = await Application.find(filter)
    .populate("candidate", "name email avatar isVerified")
    .populate({
      path: "candidateProfile",
      populate: [
        { path: "skills",  select: "_id name" },
        { path: "domains", select: "_id name" },
      ],
      select: "headline skills domains overallScore profileCompleteness socialLinks capstoneProject resumeUrl avatarUrl publicSlug",
    })
    .sort({ appliedAt: -1 });

  // Smart match scoring
  const jobSkillIds = (job.requiredSkills || []).map(s => s._id.toString());
  const jobDomainId = job.domain?._id?.toString();

  const scored = all.map(app => {
    const candSkills  = (app.candidateProfile?.skills  || []).map(s => s._id.toString());
    const candDomains = (app.candidateProfile?.domains || []).map(d => d._id.toString());
    const matched    = jobSkillIds.filter(id => candSkills.includes(id)).length;
    const domainHit  = jobDomainId && candDomains.includes(jobDomainId) ? 1 : 0;
    const matchScore = jobSkillIds.length > 0
      ? Math.round(((matched + domainHit) / (jobSkillIds.length + 1)) * 100)
      : domainHit ? 100 : 50;
    return { ...app.toObject(), matchScore };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  const total       = scored.length;
  const visible     = limit === Infinity ? scored : scored.slice(0, limit);
  const lockedCount = limit === Infinity ? 0 : Math.max(0, total - limit);

  res.json(new ApiResponse(200, {
    applications: visible,
    total, lockedCount, plan,
    freeLimit: PLAN_LIMITS.free,
    proLimit:  PLAN_LIMITS.pro,
    isPremium: plan !== "free",
    page: Number(page), pages: 1,
  }));
});

const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status, hrNotes, rating, interviewDate, interviewLink, interviewType } = req.body;
  const app = await Application.findById(req.params.id)
    .populate("job")
    .populate("candidate", "name email"); // Populate candidate to grab email

  if (!app) return next(new ApiError(404, "Application not found"));
  if (app.job.postedBy.toString() !== req.user._id.toString())
    return next(new ApiError(403, "Not authorized"));

  if (status) app.status = status;
  if (hrNotes !== undefined) app.hrNotes = hrNotes;
  if (rating !== undefined)  app.rating  = rating;
  if (interviewDate) app.interviewDate = interviewDate;
  if (interviewLink) app.interviewLink = interviewLink;
  if (interviewType) app.interviewType = interviewType;
  app.updatedBy = req.user._id;
  await app.save();

  // Push notification to queue
  const { enqueueEmail } = require("../../services/queue.service");
  const { generateCandidateStatusUpdateEmail } = require("../../utils/emails/hr.emails");

  if (status && enqueueEmail) {
    const html = generateCandidateStatusUpdateEmail(app.candidate.name, app.job.title, status, interviewDate, interviewLink);
    // Fire and forget
    enqueueEmail(app.candidate.email, `Application Update: ${app.job.title}`, html).catch(console.error);
  }

  res.json(new ApiResponse(200, { application: app }, "Application updated"));
});

// Admin only — upgrade HR plan
const upgradeHRPlan = asyncHandler(async (req, res, next) => {
  const { plan } = req.body;
  if (!["free","pro","enterprise"].includes(plan))
    return next(new ApiError(400, "Invalid plan. Use: free | pro | enterprise"));

  const profile = await HRProfile.findOneAndUpdate(
    { user: req.params.userId },
    { plan, planSince: new Date(), isPremium: plan !== "free" },
    { new: true }
  );
  if (!profile) return next(new ApiError(404, "HR profile not found"));
  res.json(new ApiResponse(200, { profile }, `Plan upgraded to ${plan}`));
});

module.exports = {
  getHRProfile, updateHRProfile, postJob, getMyJobs,
  updateJob, getJobApplications, updateApplicationStatus, upgradeHRPlan,
};