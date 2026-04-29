const mongoose = require("mongoose");

/**
 * ManagerProfile – created by ADMIN, scoped to specific domains.
 * A manager can: create assessments, create/score assignments, 
 * view candidates in their domain, send emails, manage scorecards.
 */
const managerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Assigned by admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which domains this manager oversees (e.g. "Design", "Frontend")
    domains: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain" }],

    // Descriptive title like "Design Domain Lead"
    title: { type: String, default: "" },
    bio:   { type: String, maxlength: 500, default: "" },

    // Permissions — admin can fine-tune what this manager can do
    permissions: {
      canCreateAssessment:  { type: Boolean, default: true },
      canCreateAssignment:  { type: Boolean, default: true },
      canScoreAssignment:   { type: Boolean, default: true },
      canViewCandidates:    { type: Boolean, default: true },
      canSendEmails:        { type: Boolean, default: true },
      canManageScorecard:   { type: Boolean, default: true },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

managerProfileSchema.index({ user: 1 });
managerProfileSchema.index({ domains: 1 });
managerProfileSchema.index({ createdBy: 1 });

module.exports = mongoose.model("ManagerProfile", managerProfileSchema);
