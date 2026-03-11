// ============================================
// Session Verification Middleware
// ============================================
// Protects routes by validating the session-id header
// against Firestore. Only valid, non-expired sessions
// are allowed through.
//
// Header expected:
//   session-id: <sessionId>

const { db } = require("../config/firebase");

const verifySession = async (req, res, next) => {
  const sessionId = req.headers["session-id"];

  // 1. Check if session-id header is present
  if (!sessionId) {
    return res.status(401).json({
      success: false,
      message: "Session required",
    });
  }

  try {
    // 2. Query Firestore for the session document
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const sessionData = sessionDoc.data();

    // 3. Check if session is still active
    if (!sessionData.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    // 4. Check expiration
    const now = new Date();
    const expiresAt = new Date(sessionData.expiresAt);

    if (expiresAt <= now) {
      // Mark session as inactive in Firestore
      await db.collection("sessions").doc(sessionId).update({ isActive: false });

      return res.status(401).json({
        success: false,
        message: "Session expired",
      });
    }

    // 5. Session is valid — attach to request and proceed
    req.session = sessionData;
    next();
  } catch (error) {
    console.error("❌ Session verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Session verification failed",
    });
  }
};

module.exports = { verifySession };
