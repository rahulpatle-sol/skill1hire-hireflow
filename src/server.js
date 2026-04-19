require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

app.set("io", io); // access globally inside controllers via req.app.get("io")

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Room for global user notifications (Instagram style)
  socket.on("join_user", (userId) => {
    if(userId) socket.join(`user_${userId}`);
  });

  // Room for specific chat conversations
  socket.on("join_chat", (chatId) => {
    if(chatId) socket.join(`chat_${chatId}`);
  });

  socket.on("disconnect", () => {
    // disconnected
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Skill1 Hire Server & WebSockets running on http://localhost:${PORT}`);
    console.log(`📦 Environment : ${process.env.NODE_ENV}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
  });
});
