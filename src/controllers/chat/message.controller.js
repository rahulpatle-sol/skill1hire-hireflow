const Chat = require("../../models/Chat.model");
const Message = require("../../models/Message.model");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");

// @desc    Send a new message
// @route   POST /api/v1/message
// @access  Private
const sendMessage = asyncHandler(async (req, res, next) => {
  const { chatId, text, fileUrl } = req.body;

  if (!chatId || (!text && !fileUrl)) {
    return next(new ApiError(400, "Invalid message payload"));
  }

  let message = await Message.create({
    sender: req.user._id,
    text,
    fileUrl,
    chat: chatId,
  });

  message = await message.populate("sender", "name avatar");
  message = await message.populate("chat");
  message = await Message.populate(message, {
    path: "chat.participants",
    select: "name avatar email",
  });

  // Update latest message in Chat
  await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

  // 🚀 Dispatch Socket RealTime Emits
  const io = req.app.get("io");
  if (io) {
    // Blast into the chat room
    io.to(`chat_${chatId}`).emit("new_message", message.toObject());
    
    // Blast Instagram-style notifications to receivers
    message.chat.participants.forEach(user => {
      if (user._id.toString() !== req.user._id.toString()) {
        io.to(`user_${user._id}`).emit("notification", message.toObject());
      }
    });
  }

  res.status(201).json(new ApiResponse(201, { message }, "Message sent"));
});

// @desc    Get all messages for a specific chat
// @route   GET /api/v1/message/:chatId
// @access  Private
const allMessages = asyncHandler(async (req, res, next) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name avatar email")
    .populate("chat");
    
  res.json(new ApiResponse(200, { messages }));
});

// @desc    Mark all messages in a chat as read (for current user)
// @route   PUT /api/v1/message/:chatId/read
// @access  Private
const markAsRead = asyncHandler(async (req, res, next) => {
  const { chatId } = req.params;

  // Mark all messages sent by OTHER users as read
  const result = await Message.updateMany(
    { chat: chatId, sender: { $ne: req.user._id }, isRead: false },
    { $set: { isRead: true } }
  );

  // Emit socket event so sender sees their messages marked as read
  const io = req.app.get("io");
  if (io && result.modifiedCount > 0) {
    io.to(`chat_${chatId}`).emit("messages_read", {
      chatId,
      readBy: req.user._id,
    });
  }

  res.json(new ApiResponse(200, { modifiedCount: result.modifiedCount }, "Messages marked as read"));
});

module.exports = { sendMessage, allMessages, markAsRead };

