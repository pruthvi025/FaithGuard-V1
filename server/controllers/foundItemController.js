// ============================================
// Found Items Controller
// ============================================
// Handles CRUD operations for found items.
// Privacy-first: no photos, minimal data only.
//
// Firestore collection: "found_items"

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { notifyTemple } = require("../services/pushNotificationService");

// -----------------------------------------------------------------
// POST /api/found-items/create (protected)
// Submit a found item report (JSON body, no image)
// -----------------------------------------------------------------
const createFoundItem = async (req, res) => {
  const { title, category, locationFound, timeFound, image, contactPhone } = req.body;
  const session = req.session;

  if (!title || !locationFound) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: title, locationFound",
    });
  }

  try {
    const foundId = uuidv4();
    const now = new Date().toISOString();

    const foundItemData = {
      foundId,
      title: (title || "").trim(),
      category: category || "other",
      locationFound: (locationFound || "").trim(),
      timeFound: timeFound || now,
      image: image || null,
      imageApproved: false,
      contactPhone: contactPhone || null,
      finderSessionId: session.sessionId,
      templeId: session.templeId,
      status: "found", // found | matched | closed
      createdAt: now,
    };

    await db.collection("found_items").doc(foundId).set(foundItemData);

    console.log(`✅ Found item created: ${foundId} — "${(title || "").trim()}"`);

    // Notify all temple visitors about the found item
    notifyTemple(
      session.templeId,
      {
        title: "🔍 Someone found an item!",
        body: `A ${category || "item"} was found: "${(title || "").trim()}" at ${(locationFound || "").trim()}`,
      },
      {
        type: "found-item",
        foundId,
        templeId: session.templeId,
      },
      session.sessionId // exclude the finder from notification
    );

    res.status(201).json({ success: true, foundItem: foundItemData });
  } catch (error) {
    console.error("❌ Create found item error:", error.message);
    res.status(500).json({ success: false, error: "Failed to create found item report" });
  }
};

// -----------------------------------------------------------------
// GET /api/found-items?templeId=...
// Get all found items for a temple
// -----------------------------------------------------------------
const getFoundItems = async (req, res) => {
  const { templeId } = req.query;

  if (!templeId) {
    return res.status(400).json({ success: false, error: "templeId query parameter is required" });
  }

  try {
    const snapshot = await db
      .collection("found_items")
      .where("templeId", "==", templeId)
      .get();

    let items = [];
    snapshot.forEach((doc) => {
      const { contactPhone, ...item } = { id: doc.id, ...doc.data() };
      if (item.status !== "closed") {
        items.push(item);
      }
    });

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Get found items error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch found items" });
  }
};

// -----------------------------------------------------------------
// GET /api/found-items/match?templeId=...&title=...&category=...
// Check if any found items match a lost item being reported
// -----------------------------------------------------------------
const findMatches = async (req, res) => {
  const { templeId, title, category, description } = req.query;

  if (!templeId) {
    return res.status(400).json({ success: false, error: "templeId is required" });
  }

  try {
    const snapshot = await db
      .collection("found_items")
      .where("templeId", "==", templeId)
      .where("status", "==", "found")
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, matches: [] });
    }

    const searchTerms = [
      ...(title || "").toLowerCase().split(/\s+/),
      ...(description || "").toLowerCase().split(/\s+/),
    ].filter((t) => t.length > 2);

    const matches = [];
    snapshot.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() };
      let score = 0;

      if (category && item.category === category) score += 3;

      const itemText = `${item.title}`.toLowerCase();
      for (const term of searchTerms) {
        if (itemText.includes(term)) score += 1;
      }

      if (score >= 2) {
        matches.push({ ...item, matchScore: score });
      }
    });

    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ success: true, matches: matches.slice(0, 5) });
  } catch (error) {
    console.error("❌ Find matches error:", error);
    res.status(500).json({ success: false, error: "Failed to find matches" });
  }
};

// -----------------------------------------------------------------
// PATCH /api/found-items/:id/status (protected)
// Update found item status
// -----------------------------------------------------------------
const updateFoundItemStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["found", "matched", "closed", "recovery-in-progress"].includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid status" });
  }

  try {
    const docRef = db.collection("found_items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Found item not found" });
    }

    await docRef.update({ status, updatedAt: new Date().toISOString() });

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error("❌ Update found item status error:", error);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
};

// -----------------------------------------------------------------
// GET /api/found-items/:id
// Get a single found item by ID
// -----------------------------------------------------------------
const getFoundItemById = async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await db.collection("found_items").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Found item not found" });
    }

    const { contactPhone, ...publicData } = { id: doc.id, ...doc.data() };
    res.json({ success: true, item: publicData });
  } catch (error) {
    console.error("❌ Get found item by ID error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch found item" });
  }
};

// -----------------------------------------------------------------
// PATCH /api/found-items/:id/share-location (protected)
// Toggle location sharing for a found item (finder only)
// -----------------------------------------------------------------
const toggleLocationShared = async (req, res) => {
  const { id } = req.params;
  const { locationShared } = req.body;
  const currentSessionId = req.session.sessionId;

  try {
    const docRef = db.collection("found_items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Found item not found" });
    }

    const itemData = doc.data();

    // Only the finder can toggle location sharing
    if (itemData.finderSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the finder can share location" });
    }

    await docRef.update({
      locationShared: !!locationShared,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: locationShared ? "Location shared" : "Location hidden",
      locationShared: !!locationShared,
    });
  } catch (error) {
    console.error("❌ Toggle location shared error:", error);
    res.status(500).json({ success: false, error: "Failed to update location sharing" });
  }
};

module.exports = { createFoundItem, getFoundItems, getFoundItemById, findMatches, updateFoundItemStatus, toggleLocationShared };
