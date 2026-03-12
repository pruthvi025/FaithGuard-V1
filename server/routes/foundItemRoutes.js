// ============================================
// Found Item Routes
// ============================================
// Routes for the found item reporting system.
// Simple JSON endpoints — no image uploads.

const express = require("express");
const { verifySession } = require("../middleware/sessionMiddleware");
const {
  createFoundItem,
  getFoundItems,
  findMatches,
  updateFoundItemStatus,
} = require("../controllers/foundItemController");

const router = express.Router();

// Found item creation (JSON body)
router.post("/create", verifySession, createFoundItem);

// Get all found items for a temple
router.get("/", verifySession, getFoundItems);

// Match found items against a lost item description
router.get("/match", verifySession, findMatches);

// Update found item status
router.patch("/:id/status", verifySession, updateFoundItemStatus);

module.exports = router;
