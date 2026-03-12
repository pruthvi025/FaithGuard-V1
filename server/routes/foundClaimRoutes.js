// ============================================
// Found Claim Routes
// ============================================
// Routes for the found item claim verification system.
// All routes require a valid session.
// The create route uses multer for multipart file uploads (verification photo).

const express = require("express");
const multer = require("multer");
const { verifySession } = require("../middleware/sessionMiddleware");
const {
  createFoundClaim,
  getPendingFoundClaims,
  approveFoundClaim,
  rejectFoundClaim,
  getFoundClaimStatus,
  getFoundClaimsForItem,
} = require("../controllers/foundClaimController");

const router = express.Router();

// Multer configuration for verification photo uploads (memory storage → buffer)
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

// Claim creation uses multer for verification photo upload
// The "image" field name matches the FormData field from the frontend
router.post("/create", verifySession, upload.single("image"), createFoundClaim);

// Other found claim routes
router.get("/pending/:sessionId", verifySession, getPendingFoundClaims);
router.post("/approve", verifySession, approveFoundClaim);
router.post("/reject", verifySession, rejectFoundClaim);
router.get("/status/:foundItemId", verifySession, getFoundClaimStatus);
router.get("/for-item/:foundItemId", verifySession, getFoundClaimsForItem);

module.exports = router;
