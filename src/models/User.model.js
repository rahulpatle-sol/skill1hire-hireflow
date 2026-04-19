const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// first i  import e
//  user schema is the user databe model  that  crete USer in mongodb clusster 

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,//  name should be the string not number
      required: [true, "Name is required"],// name is required  for save profile 
      trim: true,//  trim is used to remove the white space from the name 
      maxlength: [100, "Name cannot exceed 100 characters"],// sting cu  hige usage
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,// email  uniouw uniqq 
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],//  pattern match  forrif the correct email  va
    },
    password: {
      type: String,
      required:true,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["candidate", "hr", "mentor", "admin", "manager", "master"],
      default: "candidate",
    },
    avatar: { type: String, default: "" },
    googleId: { type: String, default: null },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    isEmailVerified: { type: Boolean, default: false },
    // prevent  unverified user to login  
    emailVerifyToken: { type: String, select: false },
    //  
    emailVerifyExpiry: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    //  
    resetPasswordExpiry: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    // Admin can verify profiles
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false }, // 24-hr deletion lock
    scheduledDeletionAt: { type: Date }, 
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────
// email is already indexed via unique:true on the field
//indexing is used for fast data retribed and unique features
//    
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ isVerified: 1, role: 1 });

// ── Hash password before save ─────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare password ──────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Remove sensitive fields from JSON output ──────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerifyToken;
  delete obj.resetPasswordToken;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
