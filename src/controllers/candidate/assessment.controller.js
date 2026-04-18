const { Assessment, AssessmentResult } = require("../../models/Assessment.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const ApiError  = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// ─────────────────────────────────────────────────
// @desc  Get assessments for this candidate
//        • If admin has assigned specific assessments → show ONLY those
//        • Else if candidate has domains → show domain-matched
//        • Else → show all active (fallback so they're never stuck)
// @route GET /api/v1/candidate/assessments
// @access Private (candidate)
// ─────────────────────────────────────────────────
const getMyAssessments = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id });
  if (!profile) return next(new ApiError(404, "Profile not found"));

  let filter = { isActive: true };
  let isAssigned = false;

  // 1️⃣  Admin-assigned assessments take priority
  if (profile.assignedAssessments && profile.assignedAssessments.length > 0) {
    filter._id = { $in: profile.assignedAssessments };
    isAssigned = true;
  }
  // 2️⃣  Domain-matched (candidate has set domains on profile)
  else if (profile.domains && profile.domains.length > 0) {
    filter.domain = { $in: profile.domains };
  }
  // 3️⃣  Fallback — all active (no profile set up yet)

  const assessments = await Assessment.find(filter)
    .populate("domain", "name")
    .populate("skill",  "name")
    .select("-questions.correctAnswer -questions.explanation")
    .sort("-createdAt");

  // Attach completed results
  const results = await AssessmentResult.find({ candidate: req.user._id })
    .select("assessment isPassed percentageScore attemptNumber totalMarksObtained totalMarks");

  const resultMap = {};
  results.forEach(r => { resultMap[r.assessment.toString()] = r; });

  const enriched = assessments.map(a => ({
    ...a.toObject(),
    isCompleted: !!resultMap[a._id.toString()],
    myResult:    resultMap[a._id.toString()] || null,
    isAssigned,
  }));

  res.json(new ApiResponse(200, { assessments: enriched }));
});

// ─────────────────────────────────────────────────
// @desc  Get a single assessment to attempt
// @route GET /api/v1/candidate/assessments/:id
// @access Private (candidate)
// ─────────────────────────────────────────────────
const getAssessmentById = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate("domain", "name")
    .populate("skill",  "name");

  if (!assessment || !assessment.isActive)
    return next(new ApiError(404, "Assessment not found"));

  // Hide correct answers while taking
  const questions = assessment.questions.map(q => ({
    questionText: q.questionText,
    options:      q.options,
    marks:        q.marks,
    type:         q.type,
    _id:          q._id,
  }));

  res.json(new ApiResponse(200, {
    assessment: {
      ...assessment.toObject(),
      questions,
    },
  }));
});

// ─────────────────────────────────────────────────
// @desc  Submit an assessment
// @route POST /api/v1/candidate/assessments/:id/submit
// @access Private (candidate)
// ─────────────────────────────────────────────────
const submitAssessment = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new ApiError(404, "Assessment not found"));

  const { answers = [], timeTakenMinutes = 0 } = req.body;

  // Auto-grade
  let totalMarks = 0;
  let obtained   = 0;
  let hasDescriptive = false;

  assessment.questions.forEach((q, qi) => {
    totalMarks += q.marks || 1;
    const submitted = answers.find(a => a.questionIndex === qi);
    
    if (q.type === "descriptive") {
      hasDescriptive = true;
      // requires manual HR grading
    } else {
      if (submitted && submitted.selectedOption === q.correctAnswer) {
        obtained += q.marks || 1;
      }
    }
  });

  let pct = 0;
  let isPassed = false;
  let status = "pending_review";

  if (!hasDescriptive) {
    pct = Math.round((obtained / totalMarks) * 100);
    const passMarks = assessment.passingMarks || Math.ceil(totalMarks * 0.6);
    isPassed  = obtained >= passMarks;
    status = isPassed ? "passed" : "failed";
  }

  // Count previous attempts
  const prevCount = await AssessmentResult.countDocuments({
    candidate:  req.user._id,
    assessment: assessment._id,
  });

  const result = await AssessmentResult.create({
    candidate:          req.user._id,
    assessment:         assessment._id,
    answers:            answers.map(a => ({
      questionIndex: a.questionIndex,
      selectedOption: a.selectedOption,
      answerText: a.answerText,
      answerFileUrl: a.answerFileUrl
    })),
    totalMarksObtained: obtained,
    totalMarks,
    percentageScore:    pct,
    isPassed,
    status,
    timeTakenMinutes,
    attemptNumber:      prevCount + 1,
  });

  // Update candidate overall score if passed
  if (isPassed) {
    const passedCount = await AssessmentResult.countDocuments({
      candidate: req.user._id,
      isPassed:  true,
    });
    const newScore = Math.min(100, 50 + passedCount * 10);
    await CandidateProfile.findOneAndUpdate(
      { user: req.user._id },
      { overallScore: newScore }
    );
  }

  res.json(new ApiResponse(200, { result }));
});

module.exports = { getMyAssessments, getAssessmentById, submitAssessment };