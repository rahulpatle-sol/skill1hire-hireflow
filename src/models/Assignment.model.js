const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: { type: Date, required: true },
    githubRequired: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted", "reviewed", "rejected"],
      default: "pending",
    },
    submissionUrl: { type: String, default: "" },   // Usually for live web demo or docs
    githubRepoUrl: { type: String, default: "" },   // Usually for codebase
    submittedAt: { type: Date },
    score: { type: Number, default: 0, min: 0, max: 100 },
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
);

assignmentSchema.index({ assignedTo: 1 });
assignmentSchema.index({ assignedBy: 1 });
assignmentSchema.index({ domain: 1 });
assignmentSchema.index({ status: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
