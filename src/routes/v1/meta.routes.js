const router = require("express").Router();
const Domain = require("../../models/Domain.model");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { cacheMiddleware } = require("../../services/cache.service");

// GET /api/v1/meta/domains
router.get("/domains", cacheMiddleware(3600), asyncHandler(async (req, res) => {
  // Domain.model exports TWO models — Domain and Skill
  // We need the Domain mongoose model directly
  const mongoose = require("mongoose");
  const DomainModel = mongoose.model("Domain");
  const domains = await DomainModel.find({ isActive: true }).sort("name").select("_id name slug");
  res.json(new ApiResponse(200, { domains }));
}));

// GET /api/v1/meta/skills?domain=id
router.get("/skills", cacheMiddleware(3600), asyncHandler(async (req, res) => {
  const mongoose = require("mongoose");
  const SkillModel = mongoose.model("Skill");
  const filter = req.query.domain ? { domain: req.query.domain } : {};
  const skills = await SkillModel.find(filter).populate("domain", "name").sort("name").select("_id name slug domain");
  res.json(new ApiResponse(200, { skills }));
}));

module.exports = router;