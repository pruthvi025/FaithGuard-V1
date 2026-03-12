// ============================================
// Message Routes
// ============================================
// All message routes are session-protected.
// Supports private 1:1 conversations per item.

const express = require("express");
const { verifySession } = require("../middleware/sessionMiddleware");
const { getMessages, addMessage, getConversations } = require("../controllers/messageController");

const router = express.Router();

// Get all conversation threads for an item (for the current user)
router.get("/:itemId/conversations", verifySession, getConversations);

// Get messages for a specific 1:1 conversation
router.get("/:itemId/:peerSessionId", verifySession, getMessages);

// Send a message (creates or continues a conversation)
router.post("/:itemId", verifySession, addMessage);

module.exports = router;
