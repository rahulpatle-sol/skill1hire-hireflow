const mongoose = require("mongoose");

const mentorSessionSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["hourly", "monthly"],
      required: true,
    },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    meetLink: { type: String, default: "" },
    topic: { type: String, default: "" },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "ongoing", "completed", "cancelled", "no_show"],
      default: "pending",
    },

    // Payment
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    paymentId: { type: String, default: "" },

    // Feedback
    candidateRating: { type: Number, min: 1, max: 5 },
    candidateFeedback: { type: String, default: "" },
    mentorFeedback: { type: String, default: "" },
  },
  { timestamps: true }
);

mentorSessionSchema.index({ mentor: 1 });
mentorSessionSchema.index({ candidate: 1 });
mentorSessionSchema.index({ scheduledAt: 1 });
mentorSessionSchema.index({ status: 1 });
mentorSessionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("MentorSession", mentorSessionSchema);
