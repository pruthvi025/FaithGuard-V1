// ============================================
// Message Routes
// ============================================
// GET messages (public), POST messages (protected).

const express = require("express");
const { verifySession } = require("../middleware/sessionMiddleware");
const { getMessages, addMessage } = require("../controllers/messageController");

const router = express.Router();

// Public read
router.get("/:itemId", getMessages);

// Protected write
router.post("/:itemId", verifySession, addMessage);

module.exports = router;
