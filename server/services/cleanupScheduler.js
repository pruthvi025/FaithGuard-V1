// ============================================
// Session Cleanup Scheduler
// ============================================
// Runs periodically to delete expired sessions
// and FCM tokens from Firestore automatically.

const { db } = require("../config/firebase");

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // Run every 30 minutes

/**
 * Delete expired sessions and their associated FCM tokens from Firestore.
 */
async function cleanupExpiredData() {
  const now = new Date().toISOString();
  let sessionsDeleted = 0;
  let tokensDeleted = 0;

  try {
    // 1. Find and delete expired sessions
    const expiredSessions = await db
      .collection("sessions")
      .where("expiresAt", "<=", now)
      .get();

    if (!expiredSessions.empty) {
      const batch = db.batch();
      expiredSessions.forEach((doc) => {
        batch.delete(doc.ref);
        sessionsDeleted++;
      });

      // Firestore batch limit is 500 — split if needed
      if (sessionsDeleted <= 500) {
        await batch.commit();
      } else {
        // Delete in chunks of 500
        const docs = expiredSessions.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const chunk = db.batch();
          docs.slice(i, i + 500).forEach((doc) => chunk.delete(doc.ref));
          await chunk.commit();
        }
      }
    }

    // 2. Find and delete expired FCM tokens
    const expiredTokens = await db
      .collection("fcm_tokens")
      .where("expiresAt", "<=", now)
      .get();

    if (!expiredTokens.empty) {
      const batch = db.batch();
      expiredTokens.forEach((doc) => {
        batch.delete(doc.ref);
        tokensDeleted++;
      });

      if (tokensDeleted <= 500) {
        await batch.commit();
      } else {
        const docs = expiredTokens.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const chunk = db.batch();
          docs.slice(i, i + 500).forEach((doc) => chunk.delete(doc.ref));
          await chunk.commit();
        }
      }
    }

    // 3. Mark inactive sessions that expired but weren't cleaned
    const inactiveSessions = await db
      .collection("sessions")
      .where("isActive", "==", true)
      .where("expiresAt", "<=", now)
      .get();

    if (!inactiveSessions.empty) {
      const batch = db.batch();
      inactiveSessions.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
      });
      await batch.commit();
    }

    if (sessionsDeleted > 0 || tokensDeleted > 0) {
      console.log(
        `🧹 Cleanup: ${sessionsDeleted} expired sessions, ${tokensDeleted} expired tokens deleted`
      );
    }
  } catch (error) {
    console.error("❌ Cleanup error:", error.message);
  }
}

/**
 * Start the cleanup scheduler.
 * Runs immediately once, then every CLEANUP_INTERVAL_MS.
 */
function startCleanupScheduler() {
  // Run once on startup
  cleanupExpiredData();

  // Then run periodically
  const timer = setInterval(cleanupExpiredData, CLEANUP_INTERVAL_MS);

  console.log(
    `🧹 Cleanup scheduler started (every ${CLEANUP_INTERVAL_MS / 60000} minutes)`
  );

  return timer;
}

module.exports = { startCleanupScheduler, cleanupExpiredData };
