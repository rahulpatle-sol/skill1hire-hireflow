const jwt = require("jsonwebtoken");

const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
};

const generateTokenPair = (id, role) => ({
  accessToken: generateAccessToken(id, role),
  refreshToken: generateRefreshToken(id),
});

module.exports = { generateAccessToken, generateRefreshToken, generateTokenPair };
