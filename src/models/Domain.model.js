const mongoose = require("mongoose");

// ── Domain Model ──────────────────────────────────
const domainSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Domain name required"],
      unique: true,
      trim: true,
    },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// slug is already indexed via unique:true
domainSchema.index({ isActive: 1 });

// ── Skill Model ───────────────────────────────────
const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Skill name required"],
      trim: true,
    },
    slug: { type: String, unique: true, lowercase: true },
    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

skillSchema.index({ domain: 1 });
// slug already indexed via unique:true
skillSchema.index({ name: "text" });

const Domain = mongoose.model("Domain", domainSchema);
const Skill = mongoose.model("Skill", skillSchema);

module.exports = { Domain, Skill };
