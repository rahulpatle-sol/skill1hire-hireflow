const mongoose = require("mongoose");

const mentorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    headline: { type: String, maxlength: 200, default: "" },
    bio: { type: String, maxlength: 1500, default: "" },
    expertise: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
    domains: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain" }],
    yearsOfExperience: { type: Number, default: 0 },
    currentCompany: { type: String, default: "" },
    currentRole: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    githubUrl: { type: String, default: "" },
    websiteUrl: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    languages: [{ type: String }],

    // Pricing
    hourlyRate: { type: Number, default: 0 },
    monthlyRate: { type: Number, default: 0 },
    isFreeFirstSession: { type: Boolean, default: false },
    currency: { type: String, default: "INR" },

    // Availability (weekday slots)
    availability: [
      {
        day: {
          type: String,
          enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        },
        slots: [{ startTime: String, endTime: String }],
      },
    ],

    // Verification
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String, default: "" },
    verifiedAt: { type: Date },

    // Stats
    totalSessions: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// user is already indexed via unique:true
mentorProfileSchema.index({ isVerified: 1 });
mentorProfileSchema.index({ expertise: 1 });
mentorProfileSchema.index({ domains: 1 });
mentorProfileSchema.index({ avgRating: -1 });

module.exports = mongoose.model("MentorProfile", mentorProfileSchema);
