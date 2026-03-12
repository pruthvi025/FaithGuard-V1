// ============================================
// Found Item Routes
// ============================================
// Routes for the found item reporting system.

const express = require("express");
const multer = require("multer");
const { verifySession } = require("../middleware/sessionMiddleware");
const {
  createFoundItem,
  getFoundItems,
  findMatches,
  updateFoundItemStatus,
} = require("../controllers/foundItemController");

const router = express.Router();

// Multer configuration for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image uploads are allowed"), false);
    }
  },
});

// Found item creation with optional image upload
router.post("/create", verifySession, upload.single("image"), createFoundItem);

// Get all found items for a temple
router.get("/", verifySession, getFoundItems);

// Match found items against a lost item description
router.get("/match", verifySession, findMatches);

// Update found item status
router.patch("/:id/status", verifySession, updateFoundItemStatus);

module.exports = router;
