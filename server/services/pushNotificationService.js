// ============================================
// Push Notification Service
// ============================================
// Sends FCM push notifications to temple visitors.
// Uses Firebase Admin SDK messaging.
// Non-blocking — errors are logged but never thrown.

const { admin, db } = require("../config/firebase");

/**
 * Send push notification to all active devices at a temple.
 *
 * @param {string} templeId  — temple to notify
 * @param {object} notification — { title, body }
 * @param {object} data — additional key-value data payload
 * @param {string} [excludeSessionId] — reporter's sessionId (don't notify yourself)
 */
async function notifyTemple(templeId, notification, data = {}, excludeSessionId = null) {
  try {
    // 1. Fetch all active FCM tokens for this temple
    const snapshot = await db
      .collection("fcm_tokens")
      .where("templeId", "==", templeId)
      .where("isActive", "==", true)
      .get();

    if (snapshot.empty) {
      console.log(`📭 No active tokens for temple ${templeId} — skipping notification`);
      return { sent: 0, failed: 0 };
    }

    const now = new Date();
    const tokens = [];
    const expiredDocs = [];

    snapshot.forEach((doc) => {
      const d = doc.data();

      // Skip expired tokens
      if (d.expiresAt && new Date(d.expiresAt) <= now) {
        expiredDocs.push(doc.id);
        return;
      }

      // Skip the reporter's own token
      if (excludeSessionId && d.sessionId === excludeSessionId) {
        return;
      }

      if (d.token) {
        tokens.push(d.token);
      }
    });

    // Clean up expired tokens in background
    if (expiredDocs.length > 0) {
      cleanupExpiredTokens(expiredDocs);
    }

    if (tokens.length === 0) {
      console.log(`📭 No valid tokens to notify for temple ${templeId}`);
      return { sent: 0, failed: 0 };
    }

    // 2. De-duplicate tokens
    const uniqueTokens = [...new Set(tokens)];

    // 3. Send using sendEachForMulticast (batches of 500)
    const results = { sent: 0, failed: 0 };

    for (let i = 0; i < uniqueTokens.length; i += 500) {
      const batch = uniqueTokens.slice(i, i + 500);

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        tokens: batch,
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(message);

        results.sent += response.successCount;
        results.failed += response.failureCount;

        // Log individual failures for debugging
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.warn(
                `  ⚠ Token ${idx} failed:`,
                resp.error?.code || resp.error?.message
              );

              // Remove invalid tokens (unregistered, invalid, etc.)
              const errorCode = resp.error?.code;
              if (
                errorCode === "messaging/invalid-registration-token" ||
                errorCode === "messaging/registration-token-not-registered"
              ) {
                removeInvalidToken(batch[idx]);
              }
            }
          });
        }
      } catch (batchError) {
        console.error(`  ❌ Batch send error:`, batchError.message);
        results.failed += batch.length;
      }
    }

    console.log(
      `🔔 Notification sent to temple ${templeId}: ${results.sent} delivered, ${results.failed} failed`
    );

    return results;
  } catch (error) {
    console.error("❌ notifyTemple error:", error.message);
    return { sent: 0, failed: 0 };
  }
}

// -----------------------------------------------------------------
// Convenience: notify about a new lost item
// -----------------------------------------------------------------
function notifyNewLostItem(item) {
  const notification = {
    title: "🔍 Lost item reported nearby",
    body: `${item.title} — ${item.location}`,
  };

  const data = {
    type: "new-lost-item",
    itemId: item.id || "",
    templeId: item.templeId || "",
  };

  // Fire-and-forget (non-blocking)
  notifyTemple(item.templeId, notification, data, item.reporterSessionId).catch(
    (err) => console.error("Push notification error:", err.message)
  );
}

// -----------------------------------------------------------------
// Convenience: notify item found
// -----------------------------------------------------------------
function notifyItemFound(item) {
  const notification = {
    title: "✅ Someone found an item",
    body: `"${item.title}" has been found`,
  };

  const data = {
    type: "item-found",
    itemId: item.id || "",
    templeId: item.templeId || "",
  };

  notifyTemple(item.templeId, notification, data).catch((err) =>
    console.error("Push notification error:", err.message)
  );
}

// -----------------------------------------------------------------
// Helpers — clean up bad tokens
// -----------------------------------------------------------------
async function cleanupExpiredTokens(docIds) {
  try {
    const batch = db.batch();
    docIds.forEach((id) => {
      batch.delete(db.collection("fcm_tokens").doc(id));
    });
    await batch.commit();
    console.log(`🧹 Cleaned up ${docIds.length} expired FCM tokens`);
  } catch (err) {
    console.warn("Token cleanup error:", err.message);
  }
}

async function removeInvalidToken(token) {
  try {
    const snapshot = await db
      .collection("fcm_tokens")
      .where("token", "==", token)
      .get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`🧹 Removed invalid FCM token`);
    }
  } catch (err) {
    console.warn("Invalid token removal error:", err.message);
  }
}

module.exports = { notifyTemple, notifyNewLostItem, notifyItemFound };
