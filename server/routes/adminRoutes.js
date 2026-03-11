// ============================================
// Admin Routes
// ============================================
// Login is public (verifies token inside controller).
// All other routes protected by verifyAdmin middleware.

const express = require("express");
const { verifyAdmin } = require("../middleware/adminMiddleware");
const {
  adminLogin,
  getAdminItems,
  forceCloseItem,
  verifyItem,
  getDashboardItems,
  deleteItem,
} = require("../controllers/adminController");
const {
  logAdminAction,
  getAdminActions,
} = require("../controllers/notificationController");

const router = express.Router();

// Public — login verifies token internally
router.post("/login", adminLogin);

// Public — dashboard items (no auth for now)
router.get("/dashboard/items", getDashboardItems);
router.patch("/dashboard/items/:id/force-close", forceCloseItem);
router.patch("/dashboard/items/:id/verify", verifyItem);
router.delete("/dashboard/items/:id", deleteItem);

// Protected — require admin authentication
router.get("/items", verifyAdmin, getAdminItems);
router.patch("/items/:id/force-close", verifyAdmin, forceCloseItem);
router.patch("/items/:id/verify", verifyAdmin, verifyItem);

// Admin action audit log
router.post("/actions", verifyAdmin, logAdminAction);
router.get("/actions", verifyAdmin, getAdminActions);

module.exports = router;

