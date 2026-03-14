// ============================================
// Items Controller
// ============================================
// Handles all item CRUD operations via Firestore.
// Collection: "items"

const { db, admin } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { notifyNewLostItem, notifyItemFound } = require("../services/pushNotificationService");

// -----------------------------------------------------------------
// GET /api/items?templeId=temple_001
// Get all active items for a temple (excludes closed by default)
// -----------------------------------------------------------------
const getItems = async (req, res) => {
  const { templeId, includeClosed } = req.query;

  if (!templeId) {
    return res.status(400).json({ success: false, error: "templeId query parameter is required" });
  }

  try {
    let query = db.collection("items").where("templeId", "==", templeId);

    const snapshot = await query.get();
    let items = [];

    snapshot.forEach((doc) => {
      const { contactPhone, ...publicData } = { id: doc.id, ...doc.data() };
      // Exclude closed items unless includeClosed=true
      if (includeClosed === "true" || publicData.status !== "closed") {
        items.push(publicData);
      }
    });

    // Sort by newest first (JS-side to avoid composite index requirement)
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Get items error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch items" });
  }
};

// -----------------------------------------------------------------
// GET /api/items/search?templeId=...&q=...
// Search items by title, description, or location
// NOTE: This must be defined BEFORE /:id route
// -----------------------------------------------------------------
const searchItems = async (req, res) => {
  const { templeId, q } = req.query;

  if (!templeId) {
    return res.status(400).json({ success: false, error: "templeId query parameter is required" });
  }

  try {
    const snapshot = await db
      .collection("items")
      .where("templeId", "==", templeId)
      .get();

    let items = [];
    const searchTerm = (q || "").toLowerCase().trim();

    snapshot.forEach((doc) => {
      const { contactPhone, ...item } = { id: doc.id, ...doc.data() };
      if (item.status === "closed") return;

      if (!searchTerm) {
        items.push(item);
        return;
      }

      // Client-side text filtering (Firestore doesn't support full-text search)
      if (
        (item.title || "").toLowerCase().includes(searchTerm) ||
        (item.description || "").toLowerCase().includes(searchTerm) ||
        (item.location || "").toLowerCase().includes(searchTerm)
      ) {
        items.push(item);
      }
    });

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Search items error:", error);
    res.status(500).json({ success: false, error: "Failed to search items" });
  }
};

// -----------------------------------------------------------------
// GET /api/items/:id
// Get a single item by document ID
// -----------------------------------------------------------------
const getItemById = async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await db.collection("items").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const { contactPhone, ...publicData } = { id: doc.id, ...doc.data() };
    res.json({ success: true, item: publicData });
  } catch (error) {
    console.error("❌ Get item error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch item" });
  }
};

// -----------------------------------------------------------------
// POST /api/items (protected — requires session-id header)
// Create a new lost item report
// -----------------------------------------------------------------
const createItem = async (req, res) => {
  const { title, description, location, image, rewardAmount, category, contactPhone } = req.body;
  const session = req.session; // attached by verifySession middleware

  if (!title || !description || !location) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: title, description, location",
    });
  }

  try {
    const itemId = uuidv4();
    const now = new Date().toISOString();

    // Look up the owner's current FCM token for persistent notifications
    let ownerNotificationToken = null;
    try {
      const tokenDoc = await db.collection("fcm_tokens").doc(session.sessionId).get();
      if (tokenDoc.exists && tokenDoc.data().token) {
        ownerNotificationToken = tokenDoc.data().token;
      }
    } catch (tokenErr) {
      console.warn("⚠ Could not fetch owner FCM token:", tokenErr.message);
    }

    const newItem = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      image: image || null,
      imageApproved: false,
      category: category || "other",
      rewardAmount: rewardAmount ? parseFloat(rewardAmount) : null,
      rewardGiven: false,
      contactPhone: contactPhone || null,
      status: "active",
      templeId: session.templeId,
      reporterSessionId: session.sessionId,
      ownerNotificationToken,
      createdAt: now,
      updatedAt: now,
      foundBySessionId: null,
      closedAt: null,
    };

    await db.collection("items").doc(itemId).set(newItem);

    console.log(`✅ Item created: ${itemId} — "${title.trim()}" (owner token: ${ownerNotificationToken ? 'stored' : 'none'})`);

    const createdItem = { id: itemId, ...newItem };

    // Fire-and-forget push notification to all temple visitors
    notifyNewLostItem(createdItem);

    res.status(201).json({
      success: true,
      item: createdItem,
    });
  } catch (error) {
    console.error("❌ Create item error:", error);
    res.status(500).json({ success: false, error: "Failed to create item" });
  }
};

// -----------------------------------------------------------------
// PATCH /api/items/:id/status (protected)
// Update item status: active → found → closed
// -----------------------------------------------------------------
const updateItemStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const session = req.session;

  if (!status || !["active", "found", "closed"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Invalid status. Must be: active, found, or closed",
    });
  }

  try {
    const docRef = db.collection("items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const updates = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === "found" && session) {
      updates.foundBySessionId = session.sessionId;
    }

    if (status === "closed") {
      updates.closedAt = new Date().toISOString();
      updates.rewardAmount = null; // Hide reward after close
    }

    await docRef.update(updates);

    const updated = await docRef.get();
    const updatedItem = { id: updated.id, ...updated.data() };
    console.log(`✅ Item ${id} status → ${status}`);

    // Fire-and-forget push notification when item is found
    if (status === "found") {
      notifyItemFound(updatedItem);
    }

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("❌ Update item status error:", error);
    res.status(500).json({ success: false, error: "Failed to update item status" });
  }
};

// -----------------------------------------------------------------
// PATCH /api/items/:id (protected)
// General item update (e.g., edit description, remove reward)
// -----------------------------------------------------------------
const updateItem = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const docRef = db.collection("items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    // Add updatedAt timestamp
    updates.updatedAt = new Date().toISOString();

    await docRef.update(updates);

    const updated = await docRef.get();
    console.log(`✅ Item ${id} updated`);

    res.json({ success: true, item: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("❌ Update item error:", error);
    res.status(500).json({ success: false, error: "Failed to update item" });
  }
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItemStatus,
  updateItem,
  searchItems,
};
