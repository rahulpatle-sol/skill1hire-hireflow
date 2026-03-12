const { Assessment, AssessmentResult } = require("../../models/Assessment.model");
const CandidateProfile = require("../../models/CandidateProfile.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// @desc    Get assessments for candidate's skills
// @route   GET /api/v1/candidate/assessments
// @access  Private (candidate)
const getMyAssessments = asyncHandler(async (req, res, next) => {
  const profile = await CandidateProfile.findOne({ user: req.user._id });
  if (!profile) return next(new ApiError(404, "Profile not found"));

  const assessments = await Assessment.find({
    domain: { $in: profile.domains },
    isActive: true,
  })
    .populate("domain", "name")
    .populate("skill", "name")
    .select("-questions.correctAnswer -questions.explanation");

  // Get completed assessments
  const completed = await AssessmentResult.find({ candidate: req.user._id }).select("assessment isPassed percentageScore");
  const completedIds = completed.map((r) => r.assessment.toString());

  const enriched = assessments.map((a) => ({
    ...a.toObject(),
    isCompleted: completedIds.includes(a._id.toString()),
    myResult: completed.find((r) => r.assessment.toString() === a._id.toString()) || null,
  }));

  res.json(new ApiResponse(200, { assessments: enriched }));
});

// @desc    Get single assessment to attempt
// @route   GET /api/v1/candidate/assessments/:id
// @access  Private (candidate)
const getAssessmentById = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate("domain", "name")
    .populate("skill", "name")
    .select("-questions.correctAnswer -questions.explanation");

  if (!assessment || !assessment.isActive) {
    return next(new ApiError(404, "Assessment not found"));
  }

  res.json(new ApiResponse(200, { assessment }));
});

// @desc    Submit assessment answers
// @route   POST /api/v1/candidate/assessments/:id/submit
// @access  Private (candidate)
const submitAssessment = asyncHandler(async (req, res, next) => {
  const { answers, timeTakenMinutes } = req.body;

  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new ApiError(404, "Assessment not found"));

  // Check if already attempted today
  const existingResult = await AssessmentResult.findOne({
    candidate: req.user._id,
    assessment: assessment._id,
  }).sort("-createdAt");

  const attemptNumber = existingResult ? existingResult.attemptNumber + 1 : 1;

  // Grade answers
  let totalMarksObtained = 0;
  const gradedAnswers = answers.map((ans) => {
    const question = assessment.questions[ans.questionIndex];
    const isCorrect = question && question.correctAnswer === ans.selectedOption;
    const marksObtained = isCorrect ? question.marks : 0;
    totalMarksObtained += marksObtained;
    return { ...ans, isCorrect, marksObtained };
  });

  const percentageScore = Math.round((totalMarksObtained / assessment.totalMarks) * 100);
  const isPassed = totalMarksObtained >= assessment.passingMarks;

  const result = await AssessmentResult.create({
    candidate: req.user._id,
    assessment: assessment._id,
    answers: gradedAnswers,
    totalMarksObtained,
    totalMarks: assessment.totalMarks,
    percentageScore,
    isPassed,
    timeTakenMinutes,
    attemptNumber,
  });

  // Update candidate's overall score
  if (isPassed) {
    const allResults = await AssessmentResult.find({
      candidate: req.user._id,
      isPassed: true,
    });
    const avgScore = allResults.reduce((acc, r) => acc + r.percentageScore, 0) / allResults.length;
    await CandidateProfile.findOneAndUpdate(
      { user: req.user._id },
      { overallScore: Math.round(avgScore) }
    );
  }

  res.json(
    new ApiResponse(
      200,
      {
        result: {
          totalMarksObtained,
          totalMarks: assessment.totalMarks,
          percentageScore,
          isPassed,
          attemptNumber,
        },
      },
      isPassed ? "🎉 Assessment passed!" : "Assessment submitted. Keep practicing!"
    )
  );
});

module.exports = { getMyAssessments, getAssessmentById, submitAssessment };
