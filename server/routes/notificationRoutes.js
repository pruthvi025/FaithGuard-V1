// ============================================
// Notification Routes
// ============================================
// FCM token management (session-protected)

const express = require("express");
const { verifySession } = require("../middleware/sessionMiddleware");
const { storeToken, removeToken, getTokensForTemple } = require("../controllers/notificationController");

const router = express.Router();

// Protected — require valid session
router.post("/token", verifySession, storeToken);
router.delete("/token", verifySession, removeToken);

// System/admin use — get tokens for a temple
router.get("/tokens/:templeId", getTokensForTemple);

module.exports = router;
