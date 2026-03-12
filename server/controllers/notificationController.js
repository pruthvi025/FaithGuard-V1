// ============================================
// Notification Controller
// ============================================
// Handles FCM token storage in Firestore and
// admin action logging.
// Collections: "fcm_tokens", "admin_actions"

const { db } = require("../config/firebase");

// -----------------------------------------------------------------
// POST /api/notifications/token (protected by session)
// Store FCM token in Firestore, linked to session and temple
// -----------------------------------------------------------------
const storeToken = async (req, res) => {
  const { token } = req.body;
  const session = req.session; // from verifySession middleware

  if (!token) {
    return res.status(400).json({ success: false, error: "FCM token is required" });
  }

  try {
    // Check if this exact token already exists for this session
    const existing = await db.collection("fcm_tokens")
      .where("sessionId", "==", session.sessionId)
      .where("token", "==", token)
      .get();

    const tokenData = {
      token,
      sessionId: session.sessionId,
      templeId: session.templeId,
      updatedAt: new Date().toISOString(),
      expiresAt: session.expiresAt,
      isActive: true,
    };

    if (!existing.empty) {
      // Update existing token doc (refresh expiry/active status)
      const docId = existing.docs[0].id;
      await db.collection("fcm_tokens").doc(docId).update(tokenData);
      console.log(`🔄 FCM token refreshed for session: ${session.sessionId}`);
    } else {
      // Create new token doc — allows multi-device (multiple tokens per session)
      tokenData.createdAt = new Date().toISOString();
      await db.collection("fcm_tokens").add(tokenData);
      console.log(`✅ New FCM token stored for session: ${session.sessionId}`);
    }

    res.json({ success: true, message: "Token stored" });
  } catch (error) {
    console.error("❌ Store token error:", error);
    res.status(500).json({ success: false, error: "Failed to store token" });
  }
};

// -----------------------------------------------------------------
// DELETE /api/notifications/token (protected by session)
// Remove FCM token from Firestore when session ends
// -----------------------------------------------------------------
const removeToken = async (req, res) => {
  const session = req.session;

  try {
    // Find all tokens for this session and delete them
    const snapshot = await db.collection("fcm_tokens")
      .where("sessionId", "==", session.sessionId)
      .get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log(`✅ FCM tokens removed for session: ${session.sessionId}`);

    res.json({ success: true, message: "Token removed" });
  } catch (error) {
    console.error("❌ Remove token error:", error);
    res.status(500).json({ success: false, error: "Failed to remove token" });
  }
};

// -----------------------------------------------------------------
// GET /api/notifications/tokens/:templeId (admin/system use)
// Get all active FCM tokens for a temple
// -----------------------------------------------------------------
const getTokensForTemple = async (req, res) => {
  const { templeId } = req.params;

  try {
    const snapshot = await db
      .collection("fcm_tokens")
      .where("templeId", "==", templeId)
      .where("isActive", "==", true)
      .get();

    const tokens = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only include if not expired
      if (new Date(data.expiresAt) > new Date()) {
        tokens.push(data.token);
      }
    });

    res.json({ success: true, tokens });
  } catch (error) {
    console.error("❌ Get tokens error:", error);
    res.status(500).json({ success: false, error: "Failed to get tokens" });
  }
};

// -----------------------------------------------------------------
// POST /api/admin/actions (admin-protected)
// Log an admin action to Firestore for audit trail
// -----------------------------------------------------------------
const logAdminAction = async (req, res) => {
  const { caseId, actionType, reason } = req.body;
  const adminUser = req.adminUser; // from verifyAdmin middleware

  if (!caseId || !actionType) {
    return res.status(400).json({ success: false, error: "caseId and actionType required" });
  }

  try {
    const actionData = {
      caseId,
      actionType, // 'force_close', 'verify', 'reject', 'desk'
      reason: reason || "",
      adminEmail: adminUser.email,
      adminUid: adminUser.uid,
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection("admin_actions").add(actionData);

    console.log(`✅ Admin action logged: ${actionType} on ${caseId} by ${adminUser.email}`);

    res.status(201).json({
      success: true,
      action: { id: docRef.id, ...actionData },
    });
  } catch (error) {
    console.error("❌ Log admin action error:", error);
    res.status(500).json({ success: false, error: "Failed to log action" });
  }
};

// -----------------------------------------------------------------
// GET /api/admin/actions?templeId=... (admin-protected)
// Get admin action log
// -----------------------------------------------------------------
const getAdminActions = async (req, res) => {
  try {
    const snapshot = await db
      .collection("admin_actions")
      .get();

    const actions = [];
    snapshot.forEach((doc) => {
      actions.push({ id: doc.id, ...doc.data() });
    });

    // Sort by newest first
    actions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, actions });
  } catch (error) {
    console.error("❌ Get admin actions error:", error);
    res.status(500).json({ success: false, error: "Failed to get actions" });
  }
};

module.exports = { storeToken, removeToken, getTokensForTemple, logAdminAction, getAdminActions };
