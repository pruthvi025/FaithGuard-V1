// ============================================
// Claim Routes
// ============================================
// Routes for the secure claim verification system.
// All routes require a valid session.

const express = require("express");
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

// All claim routes are session-protected
router.post("/create", verifySession, createClaim);
router.get("/pending/:sessionId", verifySession, getPendingClaims);
router.post("/approve", verifySession, approveClaim);
router.post("/reject", verifySession, rejectClaim);
router.get("/status/:itemId", verifySession, getClaimStatus);
router.get("/for-item/:itemId", verifySession, getClaimsForItem);

module.exports = router;
