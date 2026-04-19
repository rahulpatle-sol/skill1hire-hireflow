const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    text: { type: String, trim: true },
    fileUrl: { type: String }, // For Cloudinary attachments
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
