/**
 * SSE (Server-Sent Events) Notification Service
 * Lightweight real-time notifications without WebSocket overhead.
 */

// Map userId → Set<response>
const clients = new Map();

/**
 * SSE endpoint handler — clients connect here and stay connected.
 * GET /api/v1/notifications/stream
 */
const streamNotifications = (req, res) => {
  const userId = req.user?._id?.toString();
  if (!userId) return res.status(401).end();

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected", message: "Notifications connected" })}\n\n`);

  // Register client
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);

  // Keep-alive ping every 30s
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const userClients = clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) clients.delete(userId);
    }
  });
};

/**
 * Send a notification to a specific user (all their open tabs)
 * @param {string} userId
 * @param {object} notification - { type, title, message, icon?, link? }
 */
const sendNotification = (userId, notification) => {
  const id = userId?.toString();
  const userClients = clients.get(id);
  if (!userClients || userClients.size === 0) return;

  const payload = JSON.stringify({
    ...notification,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  });

  userClients.forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      userClients.delete(res);
    }
  });
};

/**
 * Broadcast a notification to ALL connected users
 * @param {object} notification - { type, title, message }
 */
const broadcastNotification = (notification) => {
  const payload = JSON.stringify({
    ...notification,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  });

  clients.forEach((userClients) => {
    userClients.forEach((res) => {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch {
        userClients.delete(res);
      }
    });
  });
};

/**
 * Send notification to all users with a specific role
 * @param {string} role - 'candidate', 'hr', 'mentor', 'admin'
 * @param {object} notification
 */
const notifyRole = async (role, notification) => {
  try {
    const User = require("../models/User.model");
    const users = await User.find({ role, isActive: true }).select("_id").lean();
    users.forEach((u) => sendNotification(u._id, notification));
  } catch (err) {
    console.error("notifyRole error:", err.message);
  }
};

module.exports = {
  streamNotifications,
  sendNotification,
  broadcastNotification,
  notifyRole,
};
