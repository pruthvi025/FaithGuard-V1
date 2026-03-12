// ============================================
// Found Claims Controller
// ============================================
// Handles claim creation, approval, rejection,
// and status checking for found items.
// Owner claims their item from the finder.
//
// Firestore collection: "found_claims"

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { notifyFoundClaimReceived, notifyFoundClaimDecision } = require("../services/pushNotificationService");

// -----------------------------------------------------------------
// POST /api/found-claims/create (protected)
// Owner submits a claim for a found item
// Accepts verification photo as: multer file (req.file) OR base64 string in body
// -----------------------------------------------------------------
const createFoundClaim = async (req, res) => {
  const { foundItemId, message } = req.body;
  const session = req.session;

  // Get verification photo: prefer multer file, fall back to base64 in body
  let verificationPhoto = null;
  if (req.file) {
    const mimeType = req.file.mimetype || "image/jpeg";
    const base64 = req.file.buffer.toString("base64");
    verificationPhoto = `data:${mimeType};base64,${base64}`;
    console.log(`📷 Found claim: received image via multer: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);
  } else if (req.body.verificationPhoto) {
    verificationPhoto = req.body.verificationPhoto;
    console.log(`📷 Found claim: received image via base64 body (${(verificationPhoto.length / 1024).toFixed(1)}KB string)`);
  }

  if (!foundItemId) {
    return res.status(400).json({ success: false, error: "foundItemId is required" });
  }

  if (!verificationPhoto) {
    return res.status(400).json({ success: false, error: "Verification photo is required to prove ownership" });
  }

  try {
    // Verify the found item exists
    const itemDoc = await db.collection("found_items").doc(foundItemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Found item not found" });
    }

    const itemData = itemDoc.data();

    // Cannot claim your own reported found item
    if (itemData.finderSessionId === session.sessionId) {
      return res.status(400).json({ success: false, error: "You cannot claim an item you reported finding" });
    }

    // Check if this user already has a pending or approved claim
    const existingClaim = await db
      .collection("found_claims")
      .where("foundItemId", "==", foundItemId)
      .where("ownerSessionId", "==", session.sessionId)
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
      foundItemId,
      ownerSessionId: session.sessionId,
      finderSessionId: itemData.finderSessionId,
      verificationPhoto,
      message: (message || "").trim(),
      status: "pending",
      createdAt: now,
    };

    await db.collection("found_claims").doc(claimId).set(claimData);

    console.log(`✅ Found claim created: ${claimId} for found item ${foundItemId} (with verification photo)`);

    // Send push notification to the finder
    notifyFoundClaimReceived({ id: foundItemId, ...itemData }, itemData.finderSessionId);

    res.status(201).json({ success: true, claim: claimData });
  } catch (error) {
    console.error("❌ Create found claim error:", error.message, error.stack);
    res.status(500).json({ success: false, error: "Failed to create claim", details: error.message });
  }
};

// -----------------------------------------------------------------
// GET /api/found-claims/pending/:sessionId (protected)
// Get all pending claims for found items reported by this finder
// -----------------------------------------------------------------
const getPendingFoundClaims = async (req, res) => {
  const currentSessionId = req.session.sessionId;

  try {
    const snapshot = await db
      .collection("found_claims")
      .where("finderSessionId", "==", currentSessionId)
      .where("status", "==", "pending")
      .get();

    const claims = [];
    snapshot.forEach((doc) => {
      claims.push({ id: doc.id, ...doc.data() });
    });

    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, claims });
  } catch (error) {
    console.error("❌ Get pending found claims error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch claims" });
  }
};

// -----------------------------------------------------------------
// POST /api/found-claims/approve (protected)
// Finder approves a claim — unlocks chat
// -----------------------------------------------------------------
const approveFoundClaim = async (req, res) => {
  const { claimId } = req.body;
  const currentSessionId = req.session.sessionId;

  if (!claimId) {
    return res.status(400).json({ success: false, error: "claimId is required" });
  }

  try {
    const claimDoc = await db.collection("found_claims").doc(claimId).get();

    if (!claimDoc.exists) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const claim = claimDoc.data();

    // Only the finder can approve
    if (claim.finderSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the finder can approve claims" });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({ success: false, error: `Claim is already ${claim.status}` });
    }

    // Update claim status
    await db.collection("found_claims").doc(claimId).update({
      status: "approved",
      approvedAt: new Date().toISOString(),
    });

    // Update found item status to recovery-in-progress
    await db.collection("found_items").doc(claim.foundItemId).update({
      status: "recovery-in-progress",
      ownerSessionId: claim.ownerSessionId,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Found claim approved: ${claimId} — item ${claim.foundItemId} now recovery-in-progress`);

    // Notify the owner
    const itemDoc = await db.collection("found_items").doc(claim.foundItemId).get();
    const itemData = itemDoc.exists ? { id: claim.foundItemId, ...itemDoc.data() } : { id: claim.foundItemId, title: "Found Item" };
    notifyFoundClaimDecision(itemData, claim.ownerSessionId, true);

    res.json({ success: true, message: "Claim approved" });
  } catch (error) {
    console.error("❌ Approve found claim error:", error);
    res.status(500).json({ success: false, error: "Failed to approve claim" });
  }
};

// -----------------------------------------------------------------
// POST /api/found-claims/reject (protected)
// Finder rejects a claim
// -----------------------------------------------------------------
const rejectFoundClaim = async (req, res) => {
  const { claimId } = req.body;
  const currentSessionId = req.session.sessionId;

  if (!claimId) {
    return res.status(400).json({ success: false, error: "claimId is required" });
  }

  try {
    const claimDoc = await db.collection("found_claims").doc(claimId).get();

    if (!claimDoc.exists) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const claim = claimDoc.data();

    // Only the finder can reject
    if (claim.finderSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the finder can reject claims" });
    }

    if (claim.status !== "pending") {
      return res.status(400).json({ success: false, error: `Claim is already ${claim.status}` });
    }

    await db.collection("found_claims").doc(claimId).update({
      status: "rejected",
      rejectedAt: new Date().toISOString(),
    });

    console.log(`❌ Found claim rejected: ${claimId}`);

    // Notify the owner
    const itemDoc = await db.collection("found_items").doc(claim.foundItemId).get();
    const itemData = itemDoc.exists ? { id: claim.foundItemId, ...itemDoc.data() } : { id: claim.foundItemId, title: "Found Item" };
    notifyFoundClaimDecision(itemData, claim.ownerSessionId, false);

    res.json({ success: true, message: "Claim rejected" });
  } catch (error) {
    console.error("❌ Reject found claim error:", error);
    res.status(500).json({ success: false, error: "Failed to reject claim" });
  }
};

// -----------------------------------------------------------------
// GET /api/found-claims/status/:foundItemId (protected)
// Get the current user's claim status for a specific found item
// -----------------------------------------------------------------
const getFoundClaimStatus = async (req, res) => {
  const { foundItemId } = req.params;
  const currentSessionId = req.session.sessionId;

  try {
    const snapshot = await db
      .collection("found_claims")
      .where("foundItemId", "==", foundItemId)
      .where("ownerSessionId", "==", currentSessionId)
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, claim: null });
    }

    const claims = [];
    snapshot.forEach((doc) => claims.push(doc.data()));
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, claim: claims[0] });
  } catch (error) {
    console.error("❌ Get found claim status error:", error);
    res.status(500).json({ success: false, error: "Failed to get claim status" });
  }
};

// -----------------------------------------------------------------
// GET /api/found-claims/for-item/:foundItemId (protected)
// Get all claims for a specific found item (for the finder)
// -----------------------------------------------------------------
const getFoundClaimsForItem = async (req, res) => {
  const { foundItemId } = req.params;
  const currentSessionId = req.session.sessionId;

  try {
    // Verify the requester is the finder
    const itemDoc = await db.collection("found_items").doc(foundItemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Found item not found" });
    }

    const itemData = itemDoc.data();
    if (itemData.finderSessionId !== currentSessionId) {
      return res.status(403).json({ success: false, error: "Only the finder can view claims" });
    }

    const snapshot = await db
      .collection("found_claims")
      .where("foundItemId", "==", foundItemId)
      .get();

    const claims = [];
    snapshot.forEach((doc) => claims.push(doc.data()));
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, claims });
  } catch (error) {
    console.error("❌ Get found claims for item error:", error);
    res.status(500).json({ success: false, error: "Failed to get claims" });
  }
};

module.exports = {
  createFoundClaim,
  getPendingFoundClaims,
  approveFoundClaim,
  rejectFoundClaim,
  getFoundClaimStatus,
  getFoundClaimsForItem,
};
