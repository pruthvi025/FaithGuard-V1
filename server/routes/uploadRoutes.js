// ============================================
// Upload Routes
// ============================================
// POST /api/upload/image — upload item image to Cloud Storage and return URL
// Protected by session middleware.

const express = require("express");
const multer = require("multer");
const { verifySession } = require("../middleware/sessionMiddleware");
const { uploadImage } = require("../controllers/uploadController");

const router = express.Router();

// Multer config — store in memory buffer, max 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Session-protected image upload
router.post("/image", verifySession, upload.single("image"), uploadImage);

module.exports = router;
