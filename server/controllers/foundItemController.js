// ============================================
// Found Items Controller
// ============================================
// Handles CRUD operations for found items.
// When a finder discovers an item but no matching
// lost report exists, they can create a found item
// record for later matching.
//
// Firestore collection: "found_items"

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// -----------------------------------------------------------------
// POST /api/found-items/create (protected)
// Submit a found item report
// -----------------------------------------------------------------
const createFoundItem = async (req, res) => {
  const { title, description, category, locationFound, timeFound, message } = req.body;
  const session = req.session;

  if (!title || !description || !locationFound) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: title, description, locationFound",
    });
  }

  // Get image: prefer multer file, fall back to base64 in body
  let photoUrl = null;
  if (req.file) {
    const mimeType = req.file.mimetype || "image/jpeg";
    const base64 = req.file.buffer.toString("base64");
    photoUrl = `data:${mimeType};base64,${base64}`;
    console.log(`📷 Found item image via multer: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);
  } else if (req.body.photoUrl) {
    photoUrl = req.body.photoUrl;
  }

  try {
    const foundId = uuidv4();
    const now = new Date().toISOString();

    const foundItemData = {
      foundId,
      title: title.trim(),
      description: description.trim(),
      category: category || "other",
      locationFound: locationFound.trim(),
      photoUrl,
      timeFound: timeFound || now,
      message: (message || "").trim(),
      finderSessionId: session.sessionId,
      templeId: session.templeId,
      status: "found", // found | matched | closed
      createdAt: now,
    };

    await db.collection("found_items").doc(foundId).set(foundItemData);

    console.log(`✅ Found item created: ${foundId} — "${title.trim()}"`);

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
      const item = { id: doc.id, ...doc.data() };
      if (item.status !== "closed") {
        items.push(item);
      }
    });

    // Sort by newest first
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
// Returns potential matches based on temple, category, and text
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
    ].filter((t) => t.length > 2); // Skip short words

    const matches = [];
    snapshot.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() };

      // Score based on: same category + keyword overlap
      let score = 0;

      if (category && item.category === category) score += 3;

      const itemText = `${item.title} ${item.description}`.toLowerCase();
      for (const term of searchTerms) {
        if (itemText.includes(term)) score += 1;
      }

      if (score >= 2) {
        matches.push({ ...item, matchScore: score });
      }
    });

    // Sort by best match first
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

  if (!["found", "matched", "closed"].includes(status)) {
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

module.exports = { createFoundItem, getFoundItems, findMatches, updateFoundItemStatus };
