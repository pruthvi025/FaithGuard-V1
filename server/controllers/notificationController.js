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
    const tokenData = {
      token,
      sessionId: session.sessionId,
      templeId: session.templeId,
      createdAt: new Date().toISOString(),
      expiresAt: session.expiresAt, // expires when session expires
      isActive: true,
    };

    // Use sessionId as document ID (one token per session)
    await db.collection("fcm_tokens").doc(session.sessionId).set(tokenData);

    console.log(`✅ FCM token stored for session: ${session.sessionId}`);

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
    await db.collection("fcm_tokens").doc(session.sessionId).delete();

    console.log(`✅ FCM token removed for session: ${session.sessionId}`);

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
