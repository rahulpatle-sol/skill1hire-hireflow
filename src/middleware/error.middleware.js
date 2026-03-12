const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  // Always log full error in development
  console.error(`\n❌ ERROR on ${req.method} ${req.originalUrl}`);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  let error = { ...err };
  error.message = err.message;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `${field} already exists`);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, messages.join(", "));
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token has expired");
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
