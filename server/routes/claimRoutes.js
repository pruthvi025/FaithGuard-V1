// ============================================
// Claim Routes
// ============================================
// Routes for the secure claim verification system.
// All routes require a valid session.
// The create route uses multer for multipart file uploads.

const express = require("express");
const multer = require("multer");
const { verifySession } = require("../middleware/sessionMiddleware");
const {
  createClaim,
  getPendingClaims,
  approveClaim,
  rejectClaim,
  getClaimStatus,
  getClaimsForItem,
} = require("../controllers/claimController");

const router = express.Router();

// Multer configuration for image uploads (memory storage → buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image uploads are allowed"), false);
    }
  },
});

// Claim creation uses multer for file uploads
// The "image" field name matches the FormData field from the frontend
router.post("/create", verifySession, upload.single("image"), createClaim);

// Other claim routes (JSON only)
router.get("/pending/:sessionId", verifySession, getPendingClaims);
router.post("/approve", verifySession, approveClaim);
router.post("/reject", verifySession, rejectClaim);
router.get("/status/:itemId", verifySession, getClaimStatus);
router.get("/for-item/:itemId", verifySession, getClaimsForItem);

module.exports = router;
