const router = require("express").Router();
const multer = require("multer");
const { protect } = require("../../middleware/auth.middleware");
const { uploadToCloudinary } = require("../../services/cloudinary.service");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit per file inside backend memory
});

router.post("/", protect, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ApiError(400, "No file provided"));
    }
    const result = await uploadToCloudinary(req.file.buffer, "skill1-hire-assets");
    res.status(200).json(new ApiResponse(200, { 
      url: result.secure_url, 
      format: result.format, 
      size: result.bytes 
    }, "File uploaded successfully"));
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    next(new ApiError(500, "Failed to upload file to Cloudinary"));
  }
});

module.exports = router;
