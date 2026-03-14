// ============================================
// Session Controller
// ============================================
// Handles temple QR check-in, session verification,
// and heartbeat pinging via Firestore.

const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/firebase");

const SESSION_DURATION_MS = 40 * 60 * 1000; // 40 minutes

/**
 * POST /api/session/checkin
 *
 * Request body:
 *   { "templeId": "temple_001" }
 *
 * Response:
 *   { success: true, sessionToken: "...", expiresAt: "..." }
 */
const checkin = async (req, res) => {
  const { templeId } = req.body;

  if (!templeId || typeof templeId !== "string" || !(templeId || "").trim()) {
    return res.status(400).json({
      success: false,
      error: "templeId is required",
    });
  }

  const normalizedTempleId = (templeId || "").trim().toLowerCase();

  try {
    // --- Validate temple exists in Firestore ---
    // Try lowercase first, then uppercase for backward compatibility
    let templeDoc = await db.collection("temples").doc(normalizedTempleId).get();

    if (!templeDoc.exists) {
      // Fallback: try uppercase version (legacy temple IDs)
      const uppercaseId = normalizedTempleId.toUpperCase();
      templeDoc = await db.collection("temples").doc(uppercaseId).get();
    }

    if (!templeDoc.exists) {
      console.log(`❌ Invalid temple code: ${normalizedTempleId}`);
      return res.status(400).json({
        success: false,
        error: "Invalid temple code. Please check the code and try again.",
      });
    }

    const templeData = templeDoc.data();

    if (templeData.isActive === false) {
      console.log(`❌ Inactive temple: ${normalizedTempleId}`);
      return res.status(403).json({
        success: false,
        error: "This temple is currently not accepting visitors.",
      });
    }

    // --- Create session ---
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    const sessionData = {
      sessionId,
      templeId: normalizedTempleId,
      templeName: templeData.name || normalizedTempleId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      lastPingAt: now.toISOString(),
    };

    await db.collection("sessions").doc(sessionId).set(sessionData);

    console.log(`✅ Session created: ${sessionId} for temple: ${normalizedTempleId} (${templeData.name || ""})`);

    // Return sessionToken (same as sessionId) for frontend compatibility
    res.status(201).json({
      success: true,
      sessionToken: sessionId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("❌ Session creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create session",
    });
  }
};

/**
 * GET /api/session/verify
 *
 * Header:
 *   Authorization: <sessionToken>
 *
 * Response:
 *   { valid: true, templeId: "...", expiresAt: "..." }
 */
const verify = async (req, res) => {
  const sessionToken = req.headers["authorization"];

  if (!sessionToken) {
    return res.status(401).json({ valid: false, error: "No session token" });
  }

  try {
    const doc = await db.collection("sessions").doc(sessionToken).get();

    if (!doc.exists) {
      return res.status(401).json({ valid: false, error: "Invalid session" });
    }

    const session = doc.data();

    if (!session.isActive || new Date(session.expiresAt) <= new Date()) {
      return res.status(401).json({ valid: false, error: "Session expired" });
    }

    res.json({
      valid: true,
      templeId: session.templeId,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("❌ Session verify error:", error);
    res.status(500).json({ valid: false, error: "Verification failed" });
  }
};

/**
 * POST /api/session/ping
 *
 * Header:
 *   Authorization: <sessionToken>
 *
 * Updates lastPingAt in Firestore. Returns 200 if alive, 401 if dead.
 */
const ping = async (req, res) => {
  const sessionToken = req.headers["authorization"];

  if (!sessionToken) {
    return res.status(401).json({ alive: false });
  }

  try {
    const docRef = db.collection("sessions").doc(sessionToken);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(401).json({ alive: false });
    }

    const session = doc.data();

    if (!session.isActive || new Date(session.expiresAt) <= new Date()) {
      // Mark inactive
      await docRef.update({ isActive: false });
      return res.status(401).json({ alive: false });
    }

    // Update last ping timestamp
    await docRef.update({ lastPingAt: new Date().toISOString() });

    res.json({ alive: true });
  } catch (error) {
    console.error("❌ Session ping error:", error);
    res.status(500).json({ alive: false });
  }
};

module.exports = { checkin, verify, ping };
