require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const passport = require("passport");
const rateLimit = require("express-rate-limit");
require("./config/passport");

const errorHandler = require("./middleware/error.middleware");

const app = express();

// ── Security ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// ── Rate Limiter ──────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, try again later" },
});
app.use("/api", limiter);

// ── Body Parsers ──────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logger ────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Passport ──────────────────────────────────────
app.use(passport.initialize());

// ── Health Check ──────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    message: "HireFlow API is running 🚀",
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────
app.use("/api/v1/auth",      require("./routes/v1/auth.routes"));
app.use("/api/v1/candidate", require("./routes/v1/candidate.routes"));
app.use("/api/v1/hr",        require("./routes/v1/hr.routes"));
app.use("/api/v1/mentor",    require("./routes/v1/mentor.routes"));
app.use("/api/v1/admin",     require("./routes/v1/admin.routes"));
app.use("/api/v1/jobs",      require("./routes/v1/job.routes"));

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error Handler ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
