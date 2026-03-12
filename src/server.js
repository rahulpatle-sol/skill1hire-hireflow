require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 HireFlow Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment : ${process.env.NODE_ENV}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
  });
});
