const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_test_secret_32_chars_min";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret_32chars!";

const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
};

const generateTokenPair = (id, role) => ({
  accessToken: generateAccessToken(id, role),
  refreshToken: generateRefreshToken(id),
});

module.exports = { generateAccessToken, generateRefreshToken, generateTokenPair };
