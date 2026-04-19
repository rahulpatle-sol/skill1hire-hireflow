const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { accessChat, fetchChats } = require("../../controllers/chat/chat.controller");

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);

module.exports = router;
