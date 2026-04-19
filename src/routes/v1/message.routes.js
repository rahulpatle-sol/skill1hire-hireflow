const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { sendMessage, allMessages, markAsRead } = require("../../controllers/chat/message.controller");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/:chatId/read").put(protect, markAsRead);

module.exports = router;

