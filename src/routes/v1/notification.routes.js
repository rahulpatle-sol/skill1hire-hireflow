const router = require("express").Router();
const { protect } = require("../../middleware/auth.middleware");
const { streamNotifications } = require("../../services/notification.service");

// SSE stream — any authenticated user can connect
router.get("/stream", protect, streamNotifications);

module.exports = router;
