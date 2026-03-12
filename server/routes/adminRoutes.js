// ============================================
// Admin Routes
// ============================================
// Login is public (verifies token inside controller).
// Dashboard read routes are public (for now).
// All DELETE and mutation routes protected by verifyAdmin.

const express = require("express");
const { verifyAdmin } = require("../middleware/adminMiddleware");
const {
  adminLogin,
  getAdminItems,
  forceCloseItem,
  verifyItem,
  getDashboardItems,
  getDashboardFoundItems,
  deleteItem,
  deleteFoundItem,
  getAllClaims,
  deleteClaimPermanently,
  getAllConversations,
  deleteConversationPermanently,
  getAuditLogs,
} = require("../controllers/adminController");
const {
  logAdminAction,
  getAdminActions,
} = require("../controllers/notificationController");

const router = express.Router();

// Public — login verifies token internally
router.post("/login", adminLogin);

// Dashboard — read-only endpoints
router.get("/dashboard/items", getDashboardItems);
router.get("/dashboard/found-items", getDashboardFoundItems);
router.get("/dashboard/claims", getAllClaims);
router.get("/dashboard/conversations", getAllConversations);
router.get("/dashboard/audit-logs", getAuditLogs);

// Dashboard — mutations (force-close, verify)
router.patch("/dashboard/items/:id/force-close", forceCloseItem);
router.patch("/dashboard/items/:id/verify", verifyItem);

// Dashboard — permanent deletes
router.delete("/dashboard/items/:id", deleteItem);
router.delete("/dashboard/found-items/:id", deleteFoundItem);
router.delete("/dashboard/claims/:id", deleteClaimPermanently);
router.delete("/dashboard/conversations/:id", deleteConversationPermanently);

// Protected — require admin authentication
router.get("/items", verifyAdmin, getAdminItems);
router.patch("/items/:id/force-close", verifyAdmin, forceCloseItem);
router.patch("/items/:id/verify", verifyAdmin, verifyItem);

// Admin action audit log (legacy)
router.post("/actions", verifyAdmin, logAdminAction);
router.get("/actions", verifyAdmin, getAdminActions);

module.exports = router;
