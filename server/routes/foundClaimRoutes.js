// ============================================
// Found Claim Routes
// ============================================
// Routes for the found item claim verification system.
// All routes require a valid session.

const express = require("express");
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

// Claim creation (JSON body, no image required)
router.post("/create", verifySession, createFoundClaim);

// Other found claim routes
router.get("/pending/:sessionId", verifySession, getPendingFoundClaims);
router.post("/approve", verifySession, approveFoundClaim);
router.post("/reject", verifySession, rejectFoundClaim);
router.get("/status/:foundItemId", verifySession, getFoundClaimStatus);
router.get("/for-item/:foundItemId", verifySession, getFoundClaimsForItem);

module.exports = router;
