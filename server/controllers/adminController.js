// ============================================
// Admin Controller
// ============================================
// Admin operations: login verification,
// item management (all items, force-close, verify),
// cascading permanent deletes (items, claims, conversations),
// dashboard data endpoints, and audit logging.

const { db, admin } = require("../config/firebase");

// =================================================================
// UTILITY — Audit Log Helper
// =================================================================
async function logAuditAction(adminUserId, actionType, targetType, targetId, details = "") {
  try {
    await db.collection("admin_action_logs").add({
      adminUserId,
      actionType,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    });
    console.log(`📝 Audit: ${actionType} on ${targetType}/${targetId} by ${adminUserId}`);
  } catch (err) {
    console.error("❌ Audit log write failed:", err.message);
  }
}

// =================================================================
// UTILITY — Delete all documents in a subcollection (batched)
// =================================================================
async function deleteSubcollection(docRef, subcollectionName) {
  const snapshot = await docRef.collection(subcollectionName).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  let count = 0;
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });
  await batch.commit();
  return count;
}

// =================================================================
// UTILITY — Delete conversations by itemId
// =================================================================
async function deleteConversationsForItem(itemId) {
  const convSnapshot = await db
    .collection("conversations")
    .where("itemId", "==", itemId)
    .get();

  let deletedConvs = 0;
  let deletedMsgs = 0;

  for (const convDoc of convSnapshot.docs) {
    const msgCount = await deleteSubcollection(convDoc.ref, "messages");
    deletedMsgs += msgCount;
    await convDoc.ref.delete();
    deletedConvs++;
  }

  return { deletedConvs, deletedMsgs };
}

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
// Returns all lost items for admin dashboard view
// -----------------------------------------------------------------
const getDashboardItems = async (req, res) => {
  try {
    const snapshot = await db.collection("items").get();

    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        itemType: "lost",
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

    console.log(`📋 Dashboard: returned ${items.length} lost items`);

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Dashboard items error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch dashboard items" });
  }
};

// -----------------------------------------------------------------
// GET /api/admin/dashboard/found-items
// Returns all found items for admin dashboard view
// -----------------------------------------------------------------
const getDashboardFoundItems = async (req, res) => {
  try {
    const snapshot = await db.collection("found_items").get();

    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        itemType: "found",
        title: data.title || "Untitled",
        description: data.description || "",
        category: data.category || "other",
        location: data.locationFound || data.location || "Unknown",
        status: (data.status || "active").toUpperCase(),
        image: data.image || null,
        templeId: data.templeId || "",
        finderSessionId: data.finderSessionId || null,
        ownerSessionId: data.ownerSessionId || null,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || null,
      });
    });

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`📋 Dashboard: returned ${items.length} found items`);

    res.json({ success: true, items });
  } catch (error) {
    console.error("❌ Dashboard found items error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch found items" });
  }
};

// -----------------------------------------------------------------
// DELETE /api/admin/dashboard/items/:id
// Permanently delete a LOST item with cascading cleanup
// -----------------------------------------------------------------
const deleteItem = async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.adminUser ? req.adminUser.uid : "unknown";

  try {
    const docRef = db.collection("items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const itemTitle = doc.data().title || "Unknown";

    // 1. Delete related claims
    const claimsSnap = await db.collection("claims").where("itemId", "==", id).get();
    const claimBatch = db.batch();
    claimsSnap.forEach((d) => claimBatch.delete(d.ref));
    if (!claimsSnap.empty) await claimBatch.commit();

    // 2. Delete related conversations + messages
    const { deletedConvs, deletedMsgs } = await deleteConversationsForItem(id);

    // 3. Delete the item itself
    await docRef.delete();

    // 4. Audit log
    await logAuditAction(
      adminUserId,
      "delete_item",
      "item",
      id,
      `Deleted lost item "${itemTitle}" + ${claimsSnap.size} claims, ${deletedConvs} conversations, ${deletedMsgs} messages`
    );

    console.log(`🗑️ Lost item permanently deleted: ${id} — "${itemTitle}" (cascade: ${claimsSnap.size} claims, ${deletedConvs} convs, ${deletedMsgs} msgs)`);

    res.json({
      success: true,
      message: `Item "${itemTitle}" permanently deleted`,
      cascade: { claims: claimsSnap.size, conversations: deletedConvs, messages: deletedMsgs },
    });
  } catch (error) {
    console.error("❌ Delete item error:", error);
    res.status(500).json({ success: false, error: "Failed to delete item" });
  }
};

// -----------------------------------------------------------------
// DELETE /api/admin/dashboard/found-items/:id
// Permanently delete a FOUND item with cascading cleanup
// -----------------------------------------------------------------
const deleteFoundItem = async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.adminUser ? req.adminUser.uid : "unknown";

  try {
    const docRef = db.collection("found_items").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Found item not found" });
    }

    const itemTitle = doc.data().title || "Unknown";

    // 1. Delete related found_claims
    const claimsSnap = await db.collection("found_claims").where("foundItemId", "==", id).get();
    const claimBatch = db.batch();
    claimsSnap.forEach((d) => claimBatch.delete(d.ref));
    if (!claimsSnap.empty) await claimBatch.commit();

    // 2. Delete related conversations + messages
    const { deletedConvs, deletedMsgs } = await deleteConversationsForItem(id);

    // 3. Delete the found item itself
    await docRef.delete();

    // 4. Audit log
    await logAuditAction(
      adminUserId,
      "delete_item",
      "found_item",
      id,
      `Deleted found item "${itemTitle}" + ${claimsSnap.size} found_claims, ${deletedConvs} conversations, ${deletedMsgs} messages`
    );

    console.log(`🗑️ Found item permanently deleted: ${id} — "${itemTitle}" (cascade: ${claimsSnap.size} claims, ${deletedConvs} convs, ${deletedMsgs} msgs)`);

    res.json({
      success: true,
      message: `Found item "${itemTitle}" permanently deleted`,
      cascade: { claims: claimsSnap.size, conversations: deletedConvs, messages: deletedMsgs },
    });
  } catch (error) {
    console.error("❌ Delete found item error:", error);
    res.status(500).json({ success: false, error: "Failed to delete found item" });
  }
};

// -----------------------------------------------------------------
// GET /api/admin/dashboard/claims
// Get ALL claims (both lost-item claims and found-item claims)
// -----------------------------------------------------------------
const getAllClaims = async (req, res) => {
  try {
    // Fetch lost-item claims
    const lostClaimsSnap = await db.collection("claims").get();
    const claims = [];
    lostClaimsSnap.forEach((doc) => {
      const data = doc.data();
      claims.push({
        id: doc.id,
        claimType: "lost",
        claimId: data.claimId || doc.id,
        itemId: data.itemId || "",
        ownerSessionId: data.ownerSessionId || "",
        finderSessionId: data.finderSessionId || "",
        status: data.status || "pending",
        message: data.message || "",
        foundItemImage: data.foundItemImage ? "[image]" : null, // Don't send full base64
        createdAt: data.createdAt || "",
        approvedAt: data.approvedAt || null,
        rejectedAt: data.rejectedAt || null,
      });
    });

    // Fetch found-item claims
    const foundClaimsSnap = await db.collection("found_claims").get();
    foundClaimsSnap.forEach((doc) => {
      const data = doc.data();
      claims.push({
        id: doc.id,
        claimType: "found",
        claimId: data.claimId || doc.id,
        itemId: data.foundItemId || "",
        ownerSessionId: data.ownerSessionId || "",
        finderSessionId: data.finderSessionId || "",
        status: data.status || "pending",
        message: data.message || "",
        createdAt: data.createdAt || "",
        approvedAt: data.approvedAt || null,
        rejectedAt: data.rejectedAt || null,
      });
    });

    // Sort all by newest first
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`📋 Dashboard: returned ${claims.length} claims (${lostClaimsSnap.size} lost + ${foundClaimsSnap.size} found)`);

    res.json({ success: true, claims });
  } catch (error) {
    console.error("❌ Get all claims error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch claims" });
  }
};

// -----------------------------------------------------------------
// DELETE /api/admin/dashboard/claims/:id
// Permanently delete a claim + related conversation
// Accepts query param ?type=lost|found (defaults to auto-detect)
// -----------------------------------------------------------------
const deleteClaimPermanently = async (req, res) => {
  const { id } = req.params;
  const claimType = req.query.type; // 'lost' or 'found'
  const adminUserId = req.adminUser ? req.adminUser.uid : "unknown";

  try {
    let claimDoc;
    let collection;
    let itemIdField;

    // Try to auto-detect claim type
    if (claimType === "found") {
      claimDoc = await db.collection("found_claims").doc(id).get();
      collection = "found_claims";
      itemIdField = "foundItemId";
    } else if (claimType === "lost") {
      claimDoc = await db.collection("claims").doc(id).get();
      collection = "claims";
      itemIdField = "itemId";
    } else {
      // Auto-detect: try claims first, then found_claims
      claimDoc = await db.collection("claims").doc(id).get();
      if (claimDoc.exists) {
        collection = "claims";
        itemIdField = "itemId";
      } else {
        claimDoc = await db.collection("found_claims").doc(id).get();
        collection = "found_claims";
        itemIdField = "foundItemId";
      }
    }

    if (!claimDoc.exists) {
      return res.status(404).json({ success: false, error: "Claim not found" });
    }

    const claimData = claimDoc.data();
    const relatedItemId = claimData[itemIdField];

    // Delete related conversation between the two participants
    let deletedConvs = 0;
    let deletedMsgs = 0;

    if (relatedItemId && claimData.ownerSessionId && claimData.finderSessionId) {
      // Build deterministic conversation ID
      const sorted = [claimData.ownerSessionId, claimData.finderSessionId].sort();
      const convId = `${relatedItemId}_${sorted[0]}_${sorted[1]}`;

      const convRef = db.collection("conversations").doc(convId);
      const convDoc = await convRef.get();

      if (convDoc.exists) {
        const msgCount = await deleteSubcollection(convRef, "messages");
        deletedMsgs = msgCount;
        await convRef.delete();
        deletedConvs = 1;
      }
    }

    // Delete the claim
    await db.collection(collection).doc(id).delete();

    // Audit log
    await logAuditAction(
      adminUserId,
      "delete_claim",
      "claim",
      id,
      `Deleted ${collection} claim (item: ${relatedItemId}) + ${deletedConvs} conversations, ${deletedMsgs} messages`
    );

    console.log(`🗑️ Claim permanently deleted: ${id} from ${collection}`);

    res.json({
      success: true,
      message: `Claim permanently deleted`,
      cascade: { conversations: deletedConvs, messages: deletedMsgs },
    });
  } catch (error) {
    console.error("❌ Delete claim error:", error);
    res.status(500).json({ success: false, error: "Failed to delete claim" });
  }
};

// -----------------------------------------------------------------
// GET /api/admin/dashboard/conversations
// Get ALL conversations for admin view
// -----------------------------------------------------------------
const getAllConversations = async (req, res) => {
  try {
    const snapshot = await db.collection("conversations").get();

    const conversations = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        conversationId: data.conversationId || doc.id,
        itemId: data.itemId || "",
        participantA: data.participantA || "",
        participantB: data.participantB || "",
        lastMessage: data.lastMessage || "",
        lastMessageAt: data.lastMessageAt || data.createdAt || "",
        messageCount: data.messageCount || 0,
        createdAt: data.createdAt || "",
      });
    });

    conversations.sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));

    console.log(`📋 Dashboard: returned ${conversations.length} conversations`);

    res.json({ success: true, conversations });
  } catch (error) {
    console.error("❌ Get all conversations error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch conversations" });
  }
};

// -----------------------------------------------------------------
// DELETE /api/admin/dashboard/conversations/:id
// Permanently delete a conversation + all messages
// -----------------------------------------------------------------
const deleteConversationPermanently = async (req, res) => {
  const { id } = req.params;
  const adminUserId = req.adminUser ? req.adminUser.uid : "unknown";

  try {
    const convRef = db.collection("conversations").doc(id);
    const convDoc = await convRef.get();

    if (!convDoc.exists) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    const convData = convDoc.data();

    // Delete all messages in subcollection
    const deletedMsgs = await deleteSubcollection(convRef, "messages");

    // Delete the conversation document
    await convRef.delete();

    // Audit log
    await logAuditAction(
      adminUserId,
      "delete_conversation",
      "conversation",
      id,
      `Deleted conversation (item: ${convData.itemId || "?"}) with ${deletedMsgs} messages`
    );

    console.log(`🗑️ Conversation permanently deleted: ${id} (${deletedMsgs} messages)`);

    res.json({
      success: true,
      message: `Conversation permanently deleted`,
      cascade: { messages: deletedMsgs },
    });
  } catch (error) {
    console.error("❌ Delete conversation error:", error);
    res.status(500).json({ success: false, error: "Failed to delete conversation" });
  }
};

// -----------------------------------------------------------------
// GET /api/admin/dashboard/audit-logs
// Get all admin audit logs
// -----------------------------------------------------------------
const getAuditLogs = async (req, res) => {
  try {
    const snapshot = await db.collection("admin_action_logs").get();

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    // Sort by newest first
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`📋 Dashboard: returned ${logs.length} audit logs`);

    res.json({ success: true, logs });
  } catch (error) {
    console.error("❌ Get audit logs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
};

module.exports = {
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
};
