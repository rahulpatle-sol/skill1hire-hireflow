const mongoose = require("mongoose");

// ── Assessment (Question Bank) ────────────────────
const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },
    skill: { type: mongoose.Schema.Types.ObjectId, ref: "Skill" },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    questions: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: Number, required: true }, // index of correct option
        explanation: { type: String, default: "" },
        marks: { type: Number, default: 1 },
      },
    ],
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

assessmentSchema.index({ domain: 1 });
assessmentSchema.index({ skill: 1 });
assessmentSchema.index({ level: 1 });

// ── Assessment Result ─────────────────────────────
const assessmentResultSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
    },
    answers: [
      {
        questionIndex: Number,
        selectedOption: Number,
        isCorrect: Boolean,
        marksObtained: Number,
      },
    ],
    totalMarksObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentageScore: { type: Number, default: 0 },
    isPassed: { type: Boolean, default: false },
    timeTakenMinutes: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assessmentResultSchema.index({ candidate: 1 });
assessmentResultSchema.index({ assessment: 1 });
assessmentResultSchema.index({ candidate: 1, assessment: 1 });

const Assessment = mongoose.model("Assessment", assessmentSchema);
const AssessmentResult = mongoose.model("AssessmentResult", assessmentResultSchema);

module.exports = { Assessment, AssessmentResult };
