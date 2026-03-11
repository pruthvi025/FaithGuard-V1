// ============================================
// STEP 5 — Firestore Test Route
// ============================================
// GET /api/test-firebase
// Writes a test document to Firestore to verify
// the connection is working.

const express = require("express");
const { db } = require("../config/firebase");
const { verifySession } = require("../middleware/sessionMiddleware");

const router = express.Router();

router.get("/test-firebase", async (req, res) => {
  try {
    const testData = {
      message: "Firebase connected successfully",
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection("test_connection").add(testData);

    console.log("✅ Test document written with ID:", docRef.id);

    res.json({
      success: true,
      message: "Firebase connected successfully!",
      documentId: docRef.id,
      data: testData,
    });
  } catch (error) {
    console.error("❌ Firebase connection test failed:", error);
    res.status(500).json({
      success: false,
      error: "Firebase connection failed",
      details: error.message,
    });
  }
});

// ============================================
// Protected Route (requires valid session)
// ============================================
// GET /api/protected
// Demonstrates session middleware in action.
// Only accessible with a valid session-id header.

router.get("/protected", verifySession, (req, res) => {
  res.json({
    success: true,
    message: "You have access! Session is valid.",
    session: {
      sessionId: req.session.sessionId,
      templeId: req.session.templeId,
      expiresAt: req.session.expiresAt,
    },
  });
});

module.exports = router;
