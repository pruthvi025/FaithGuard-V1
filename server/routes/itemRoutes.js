// ============================================
// Item Routes
// ============================================
// GET/POST/PATCH routes for lost items.
// Write operations protected by verifySession.

const express = require("express");
const { verifySession } = require("../middleware/sessionMiddleware");
const {
  getItems,
  getItemById,
  createItem,
  updateItemStatus,
  updateItem,
  searchItems,
} = require("../controllers/itemController");

const router = express.Router();

// Public reads (session still needed for temple context, but not enforced here)
router.get("/", getItems);
router.get("/search", searchItems);
router.get("/:id", getItemById);

// Protected writes (require valid session)
router.post("/", verifySession, createItem);
router.patch("/:id/status", verifySession, updateItemStatus);
router.patch("/:id", verifySession, updateItem);

module.exports = router;
