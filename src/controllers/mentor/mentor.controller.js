const MentorProfile = require("../../models/MentorProfile.model");
const MentorSession = require("../../models/MentorSession.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// @desc    Get own mentor profile
// @route   GET /api/v1/mentor/profile
// @access  Private (mentor)
const getMentorProfile = asyncHandler(async (req, res, next) => {
  const profile = await MentorProfile.findOne({ user: req.user._id })
    .populate("user", "name email avatar")
    .populate("expertise", "name")
    .populate("domains", "name");
  if (!profile) return next(new ApiError(404, "Mentor profile not found"));
  res.json(new ApiResponse(200, { profile }));
});

// @desc    Update mentor profile
// @route   PUT /api/v1/mentor/profile
// @access  Private (mentor)
const updateMentorProfile = asyncHandler(async (req, res, next) => {
  const fields = [
    "headline", "bio", "expertise", "domains", "yearsOfExperience",
    "currentCompany", "currentRole", "linkedinUrl", "githubUrl",
    "websiteUrl", "languages", "hourlyRate", "monthlyRate",
    "isFreeFirstSession", "currency", "availability",
  ];
  const updates = {};
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const profile = await MentorProfile.findOneAndUpdate(
    { user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!profile) return next(new ApiError(404, "Mentor profile not found"));
  res.json(new ApiResponse(200, { profile }, "Profile updated"));
});

// @desc    List all verified mentors (public)
// @route   GET /api/v1/mentor
// @access  Public
const getAllMentors = asyncHandler(async (req, res) => {
  const { domain, skill, page = 1, limit = 12 } = req.query;
  const filter = { isVerified: true };
  if (domain) filter.domains = domain;
  if (skill) filter.expertise = skill;

  const skip = (page - 1) * limit;
  const [mentors, total] = await Promise.all([
    MentorProfile.find(filter)
      .populate("user", "name avatar")
      .populate("expertise", "name")
      .populate("domains", "name")
      .sort("-avgRating")
      .skip(skip)
      .limit(Number(limit)),
    MentorProfile.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { mentors, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

// @desc    Book a mentor session
// @route   POST /api/v1/mentor/:mentorId/book
// @access  Private (candidate)
const bookSession = asyncHandler(async (req, res, next) => {
  const { sessionType, scheduledAt, topic, durationMinutes } = req.body;

  const mentorProfile = await MentorProfile.findOne({
    user: req.params.mentorId,
    isVerified: true,
  });
  if (!mentorProfile) return next(new ApiError(404, "Mentor not found"));

  const amount =
    sessionType === "hourly"
      ? mentorProfile.hourlyRate
      : mentorProfile.monthlyRate;

  // Check for clashing sessions
  const clash = await MentorSession.findOne({
    mentor: req.params.mentorId,
    scheduledAt: new Date(scheduledAt),
    status: { $in: ["pending", "confirmed"] },
  });
  if (clash) return next(new ApiError(409, "This slot is already booked"));

  const session = await MentorSession.create({
    mentor: req.params.mentorId,
    candidate: req.user._id,
    sessionType,
    scheduledAt: new Date(scheduledAt),
    durationMinutes: durationMinutes || 60,
    topic,
    amount,
    currency: mentorProfile.currency,
  });

  const { enqueueEmail } = require("../../services/queue.service");
  if (enqueueEmail && req.user.email) {
    const emailHtml = `
      <h2>Mentor Session Requested</h2>
      <p>Hello ${req.user.name},</p>
      <p>You have successfully requested a ${sessionType} session with your mentor.</p>
      <p><strong>Scheduled At:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
      <p><strong>Topic:</strong> ${topic}</p>
      <p>The mentor will review and confirm this session.</p>
    `;
    enqueueEmail(req.user.email, "Session Request confirmation", emailHtml).catch(console.error);
  }

  res.status(201).json(new ApiResponse(201, { session }, "Session booked. Complete payment to confirm."));
});

// @desc    Get mentor's sessions
// @route   GET /api/v1/mentor/sessions
// @access  Private (mentor)
const getMentorSessions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { mentor: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [sessions, total] = await Promise.all([
    MentorSession.find(filter)
      .populate("candidate", "name email avatar")
      .sort("-scheduledAt")
      .skip(skip)
      .limit(Number(limit)),
    MentorSession.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { sessions, total }));
});

// @desc    Update session status (mentor confirms/cancels)
// @route   PUT /api/v1/mentor/sessions/:id
// @access  Private (mentor)
const updateSession = asyncHandler(async (req, res, next) => {
  const { status, meetLink, notes } = req.body;
  const session = await MentorSession.findOne({
    _id: req.params.id,
    mentor: req.user._id,
  }).populate("candidate", "name email");
  if (!session) return next(new ApiError(404, "Session not found"));

  if (status) session.status = status;
  if (meetLink) session.meetLink = meetLink;
  if (notes) session.notes = notes;
  await session.save();

  if (status === "completed") {
    await MentorProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { totalSessions: 1, totalEarnings: session.amount } }
    );
  }

  const { enqueueEmail } = require("../../services/queue.service");
  if (enqueueEmail && session.candidate && session.candidate.email) {
    const emailHtml = `
      <h2>Mentor Session Update</h2>
      <p>Hello,</p>
      <p>Your mentor session status has been updated to: <strong>${status ? status.toUpperCase() : "UPDATED"}</strong></p>
      ${meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}">Join Call</a></p>` : ""}
      ${notes ? `<p><strong>Mentor Notes:</strong> ${notes}</p>` : ""}
    `;
    enqueueEmail(session.candidate.email, "Mentor Session Updated", emailHtml).catch(console.error);
  }

  res.json(new ApiResponse(200, { session }, "Session updated"));
});

// @desc    Rate a session (candidate)
// @route   POST /api/v1/mentor/sessions/:id/rate
// @access  Private (candidate)
const rateSession = asyncHandler(async (req, res, next) => {
  const { rating, feedback } = req.body;
  const session = await MentorSession.findOne({
    _id: req.params.id,
    candidate: req.user._id,
    status: "completed",
  });
  if (!session) return next(new ApiError(404, "Session not found or not completed"));

  session.candidateRating = rating;
  session.candidateFeedback = feedback;
  await session.save();

  // Update mentor avg rating
  const sessions = await MentorSession.find({
    mentor: session.mentor,
    candidateRating: { $exists: true },
  });
  const avg = sessions.reduce((acc, s) => acc + s.candidateRating, 0) / sessions.length;
  await MentorProfile.findOneAndUpdate(
    { user: session.mentor },
    { avgRating: Math.round(avg * 10) / 10, totalReviews: sessions.length }
  );

  res.json(new ApiResponse(200, null, "Session rated. Thank you!"));
});

module.exports = {
  getMentorProfile,
  updateMentorProfile,
  getAllMentors,
  bookSession,
  getMentorSessions,
  updateSession,
  rateSession,
};
