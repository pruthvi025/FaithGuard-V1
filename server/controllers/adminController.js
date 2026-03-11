// ============================================
// Admin Controller
// ============================================
// Admin operations: login verification,
// item management (all items, force-close, verify).

const { db, admin } = require("../config/firebase");

// -----------------------------------------------------------------
// POST /api/admin/login
// Verify Firebase Auth ID token and return admin info
// -----------------------------------------------------------------
const adminLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, error: "idToken is required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    console.log(`✅ Admin logged in: ${decodedToken.email}`);

    res.json({
      success: true,
      admin: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      },
    });
  } catch (error) {
    console.error("❌ Admin login error:", error.message);
    res.status(401).json({ success: false, error: "Invalid admin token" });
  }
};

// -----------------------------------------------------------------
// GET /api/admin/items?templeId=...
// Get ALL items including closed (admin view)
// -----------------------------------------------------------------
const getAdminItems = async (req, res) => {
  const { templeId } = req.query;

  if (!templeId) {
    return res.status(400).json({ success: false, error: "templeId query parameter is required" });
  }

  try {
    const snapshot = await db
      .collection("items")
      .where("templeId", "==", templeId)
      .get();

    const items = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });

    // Sort by newest first (JS-side)
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Admin get items error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch items" });
  }
};

// -----------------------------------------------------------------
// PATCH /api/admin/items/:id/force-close
// Admin force-close a case
// -----------------------------------------------------------------
const forceCloseItem = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const docRef = db.collection("items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    await docRef.update({
      status: "closed",
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminClosedReason: reason || "Force closed by admin",
      rewardAmount: null,
    });

    const updated = await docRef.get();
    console.log(`✅ Item ${id} force-closed by admin`);

    res.json({ success: true, item: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("❌ Force close error:", error);
    res.status(500).json({ success: false, error: "Failed to force-close item" });
  }
};

// -----------------------------------------------------------------
// PATCH /api/admin/items/:id/verify
// Admin verify/reject a disputed item claim
// -----------------------------------------------------------------
const verifyItem = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'verify', 'reject', or 'desk'

  if (!action || !["verify", "reject", "desk"].includes(action)) {
    return res.status(400).json({
      success: false,
      error: "Invalid action. Must be: verify, reject, or desk",
    });
  }

  try {
    const docRef = db.collection("items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
      adminAction: action,
    };

    if (action === "verify") {
      updates.status = "closed";
      updates.closedAt = new Date().toISOString();
      updates.adminVerified = true;
    } else if (action === "reject") {
      updates.status = "active";
      updates.foundBySessionId = null;
      updates.adminRejected = true;
    } else if (action === "desk") {
      updates.adminDeskReview = true;
    }

    await docRef.update(updates);

    const updated = await docRef.get();
    console.log(`✅ Item ${id} admin action: ${action}`);

    res.json({ success: true, item: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("❌ Verify item error:", error);
    res.status(500).json({ success: false, error: "Failed to process admin action" });
  }
};
// -----------------------------------------------------------------
// GET /api/admin/dashboard/items
// Public (no auth) — returns all items for admin dashboard view
// -----------------------------------------------------------------
const getDashboardItems = async (req, res) => {
  try {
    const snapshot = await db.collection("items").get();

    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || "Untitled",
        description: data.description || "",
        category: data.category || "other",
        location: data.location || "Unknown",
        status: (data.status || "active").toUpperCase(),
        image: data.image || null,
        templeId: data.templeId || "",
        reporterSessionId: data.reporterSessionId || null,
        foundBySessionId: data.foundBySessionId || null,
        rewardAmount: data.rewardAmount || null,
        rewardGiven: data.rewardGiven || false,
        disputed: data.disputed || false,
        adminAction: data.adminAction || null,
        adminVerified: data.adminVerified || false,
        adminRejected: data.adminRejected || false,
        adminDeskReview: data.adminDeskReview || false,
        adminClosedReason: data.adminClosedReason || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || null,
        closedAt: data.closedAt || null,
      });
    });

    // Sort by newest first
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`📋 Dashboard: returned ${items.length} items`);

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Dashboard items error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch dashboard items" });
  }
};

// -----------------------------------------------------------------
// DELETE /api/admin/dashboard/items/:id
// Permanently delete an item from Firestore
// -----------------------------------------------------------------
const deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection("items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const itemTitle = doc.data().title || "Unknown";

    await docRef.delete();

    console.log(`🗑️ Item permanently deleted: ${id} — "${itemTitle}"`);

    res.json({ success: true, message: `Item "${itemTitle}" permanently deleted` });
  } catch (error) {
    console.error("❌ Delete item error:", error);
    res.status(500).json({ success: false, error: "Failed to delete item" });
  }
};

module.exports = { adminLogin, getAdminItems, forceCloseItem, verifyItem, getDashboardItems, deleteItem };
