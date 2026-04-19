const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    isGroupChat: { type: Boolean, default: false },
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
