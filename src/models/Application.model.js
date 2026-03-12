const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidateProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CandidateProfile",
    },
    coverLetter: { type: String, maxlength: 2000, default: "" },
    resumeUrl: { type: String, default: "" },

    status: {
      type: String,
      enum: [
        "applied",
        "shortlisted",
        "interview_scheduled",
        "interview_done",
        "offered",
        "hired",
        "rejected",
        "withdrawn",
      ],
      default: "applied",
    },

    // HR notes
    hrNotes: { type: String, default: "" },
    rating: { type: Number, min: 1, max: 5 },

    // Interview details
    interviewDate: { type: Date },
    interviewLink: { type: String },
    interviewType: {
      type: String,
      enum: ["phone", "video", "onsite", "technical"],
    },

    appliedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Prevent duplicate applications
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ candidate: 1 });
applicationSchema.index({ job: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
