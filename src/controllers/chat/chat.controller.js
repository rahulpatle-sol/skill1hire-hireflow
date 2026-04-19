const Chat = require("../../models/Chat.model");
const Message = require("../../models/Message.model");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const User = require("../../models/User.model");

// @desc    Access or create a 1-on-1 Chat
// @route   POST /api/v1/chat
// @access  Private
const accessChat = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return next(new ApiError(400, "UserId parameter is required"));
  }

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { participants: { $elemMatch: { $eq: req.user._id } } },
      { participants: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("participants", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name avatar email",
  });

  if (isChat.length > 0) {
    return res.json(new ApiResponse(200, { chat: isChat[0] }));
  }

  const chatData = {
    participants: [req.user._id, userId],
    isGroupChat: false,
    unreadCount: new Map(),
  };

  const createdChat = await Chat.create(chatData);
  const fullChat = await Chat.findOne({ _id: createdChat._id }).populate("participants", "-password");
  
  res.status(201).json(new ApiResponse(201, { chat: fullChat }, "Chat initialized"));
});

// @desc    Fetch all chats for a user
// @route   GET /api/v1/chat
// @access  Private
const fetchChats = asyncHandler(async (req, res, next) => {
  try {
    let results = await Chat.find({ participants: { $elemMatch: { $eq: req.user._id } } })
      .populate("participants", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    results = await User.populate(results, {
      path: "latestMessage.sender",
      select: "name avatar email",
    });

    res.json(new ApiResponse(200, { chats: results }));
  } catch (error) {
    next(new ApiError(500, "Failed to retrieve chats"));
  }
});

module.exports = { accessChat, fetchChats };
