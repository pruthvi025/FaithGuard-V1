// ============================================
// Claims Controller
// ============================================
// Handles claim creation, approval, rejection,
// and status checking for the secure claim
// verification system.
//
// Firestore collection: "claims"

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { notifyClaimReceivedPriority, notifyClaimDecision } = require("../services/pushNotificationService");

// -----------------------------------------------------------------
// POST /api/claims/create (protected)
// Submit a claim for a lost item
// Accepts image as: multer file (req.file) OR base64 string in body
// -----------------------------------------------------------------
const createClaim = async (req, res) => {
  const { itemId, message } = req.body;
  const session = req.session;

  // Get image: prefer multer file, fall back to base64 in body
  let foundItemImage = null;
  if (req.file) {
    // Convert multer buffer to base64 data URI
    const mimeType = req.file.mimetype || "image/jpeg";
    const base64 = req.file.buffer.toString("base64");
    foundItemImage = `data:${mimeType};base64,${base64}`;
    console.log(`📷 Received image via multer: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);
  } else if (req.body.foundItemImage) {
    foundItemImage = req.body.foundItemImage;
    console.log(`📷 Received image via base64 body (${(foundItemImage.length / 1024).toFixed(1)}KB string)`);
  }

  if (!itemId) {
    return res.status(400).json({ success: false, error: "itemId is required" });
  }

  if (!foundItemImage) {
    return res.status(400).json({ success: false, error: "Photo of found item is required" });
  }

  try {
    // Verify the item exists
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const itemData = itemDoc.data();

    // Cannot claim your own item
    if (itemData.reporterSessionId === session.sessionId) {
      return res.status(400).json({ success: false, error: "You cannot claim your own item" });
    }

    // Check if this user already has a pending or approved claim
    const existingClaim = await db
      .collection("claims")
      .where("itemId", "==", itemId)
      .where("finderSessionId", "==", session.sessionId)
      .where("status", "in", ["pending", "approved"])
      .get();

    if (!existingClaim.empty) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending or approved claim for this item",
      });
    }

    const claimId = uuidv4();
    const now = new Date().toISOString();

    const claimData = {
      claimId,
      itemId,
      ownerSessionId: itemData.reporterSessionId,
      finderSessionId: session.sessionId,
      foundItemImage,
      message: (message || "").trim(),
      status: "pending",
      createdAt: now,
    };

    await db.collection("claims").doc(claimId).set(claimData);

    console.log(`✅ Claim created: ${claimId} for item ${itemId}`);

    // Send push notification to the owner (priority: works even after session expires)
    notifyClaimReceivedPriority({ id: itemId, ...itemData }, itemData.reporterSessionId);

    res.status(201).json({ success: true, claim: claimData });
  } catch (error) {
    console.error("❌ Create claim error:", error.message, error.stack);
    res.status(500).json({ success: false, error: "Failed to create claim", details: error.message });
  }
};

// -----------------------------------------------------------------
// GET /api/claims/pending/:sessionId (protected)
// Get all pending claims for items owned by this session
// -----------------------------------------------------------------
const getPendingClaims = async (req, res) => {
  const currentSessionId = req.session.sessionId;

  try {
    const snapshot = await db
      .collection("claims")
      .where("ownerSessionId", "==", currentSessionId)
      .where("status", "==", "pending")
      .get();

    const claims = [];
    snapshot.forEach((doc) => {
      claims.push({ id: doc.id, ...doc.data() });
    });

    // Sort by newest first
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, claims });
  } catch (error) {
    console.error("❌ Get pending claims error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch claims" });
  }
};

// -----------------------------------------------------------------
// POST /api/claims/approve (protected)
// Approve a claim — reveals location and unlocks chat
// -----------------------------------------------------------------
const approveClaim = async (req, res) => {
  const { claimId } = req.body;
  const currentSessionId = req.session.sessionId;

  if (!claimId) {
    return res.status(400).json({ success: false, error: "claimId is required" });
  }

  try {
    const claimDoc = await db.collection("claims").doc(claimId).get();

    if (!claimDoc.exists) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const claim = claimDoc.data();

    // Only the item owner can approve
    if (claim.ownerSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the item owner can approve claims" });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({ success: false, error: `Claim is already ${claim.status}` });
    }

    // Update claim status
    await db.collection("claims").doc(claimId).update({
      status: "approved",
      approvedAt: new Date().toISOString(),
    });

    // Update item status to recovery-in-progress
    await db.collection("items").doc(claim.itemId).update({
      status: "recovery-in-progress",
      foundBySessionId: claim.finderSessionId,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Claim approved: ${claimId} — item ${claim.itemId} now recovery-in-progress`);

    // Notify the finder
    const itemDoc = await db.collection("items").doc(claim.itemId).get();
    const itemData = itemDoc.exists ? { id: claim.itemId, ...itemDoc.data() } : { id: claim.itemId, title: "Lost Item" };
    notifyClaimDecision(itemData, claim.finderSessionId, true);

    res.json({ success: true, message: "Claim approved" });
  } catch (error) {
    console.error("❌ Approve claim error:", error);
    res.status(500).json({ success: false, error: "Failed to approve claim" });
  }
};

// -----------------------------------------------------------------
// POST /api/claims/reject (protected)
// Reject a claim
// -----------------------------------------------------------------
const rejectClaim = async (req, res) => {
  const { claimId } = req.body;
  const currentSessionId = req.session.sessionId;

  if (!claimId) {
    return res.status(400).json({ success: false, error: "claimId is required" });
  }

  try {
    const claimDoc = await db.collection("claims").doc(claimId).get();

    if (!claimDoc.exists) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const claim = claimDoc.data();

    // Only the item owner can reject
    if (claim.ownerSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the item owner can reject claims" });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({ success: false, error: `Claim is already ${claim.status}` });
    }

    await db.collection("claims").doc(claimId).update({
      status: "rejected",
      rejectedAt: new Date().toISOString(),
    });

    console.log(`❌ Claim rejected: ${claimId}`);

    // Notify the finder
    const itemDoc = await db.collection("items").doc(claim.itemId).get();
    const itemData = itemDoc.exists ? { id: claim.itemId, ...itemDoc.data() } : { id: claim.itemId, title: "Lost Item" };
    notifyClaimDecision(itemData, claim.finderSessionId, false);

    res.json({ success: true, message: "Claim rejected" });
  } catch (error) {
    console.error("❌ Reject claim error:", error);
    res.status(500).json({ success: false, error: "Failed to reject claim" });
  }
};

// -----------------------------------------------------------------
// GET /api/claims/status/:itemId (protected)
// Get the current user's claim status for a specific item
// -----------------------------------------------------------------
const getClaimStatus = async (req, res) => {
  const { itemId } = req.params;
  const currentSessionId = req.session.sessionId;

  try {
    const snapshot = await db
      .collection("claims")
      .where("itemId", "==", itemId)
      .where("finderSessionId", "==", currentSessionId)
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, claim: null });
    }

    // Return the most recent claim
    const claims = [];
    snapshot.forEach((doc) => claims.push(doc.data()));
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, claim: claims[0] });
  } catch (error) {
    console.error("❌ Get claim status error:", error);
    res.status(500).json({ success: false, error: "Failed to get claim status" });
  }
};

// -----------------------------------------------------------------
// GET /api/claims/for-item/:itemId (protected)
// Get all claims for a specific item (for the owner)
// -----------------------------------------------------------------
const getClaimsForItem = async (req, res) => {
  const { itemId } = req.params;
  const currentSessionId = req.session.sessionId;

  try {
    // Verify the requester is the item owner
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const itemData = itemDoc.data();
    if (itemData.reporterSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the item owner can view claims" });
    }

    const snapshot = await db
      .collection("claims")
      .where("itemId", "==", itemId)
      .get();

    const claims = [];
    snapshot.forEach((doc) => claims.push(doc.data()));
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, claims });
  } catch (error) {
    console.error("❌ Get claims for item error:", error);
    res.status(500).json({ success: false, error: "Failed to get claims" });
  }
};

module.exports = { createClaim, getPendingClaims, approveClaim, rejectClaim, getClaimStatus, getClaimsForItem };
