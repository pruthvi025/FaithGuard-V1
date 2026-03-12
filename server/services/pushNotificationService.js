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

// -----------------------------------------------------------------
// Send push notification to a SPECIFIC session (targeted delivery)
// -----------------------------------------------------------------
async function notifySession(sessionId, notification, data = {}) {
  try {
    // Fetch the FCM token for this specific session
    const tokenDoc = await db.collection("fcm_tokens").doc(sessionId).get();

    if (!tokenDoc.exists) {
      console.log(`📭 No FCM token for session ${sessionId} — skipping notification`);
      return { sent: 0, failed: 0 };
    }

    const tokenData = tokenDoc.data();

    // Skip expired or inactive tokens
    if (!tokenData.isActive || (tokenData.expiresAt && new Date(tokenData.expiresAt) <= new Date())) {
      console.log(`📭 Token expired/inactive for session ${sessionId}`);
      return { sent: 0, failed: 0 };
    }

    if (!tokenData.token) {
      console.log(`📭 No valid token string for session ${sessionId}`);
      return { sent: 0, failed: 0 };
    }

    // Send to this specific token
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      token: tokenData.token,
    };

    try {
      await admin.messaging().send(message);
      console.log(`🔔 Notification sent to session ${sessionId}`);
      return { sent: 1, failed: 0 };
    } catch (sendError) {
      console.warn(`⚠ Notification to session ${sessionId} failed:`, sendError.code || sendError.message);

      // Remove invalid tokens
      if (
        sendError.code === "messaging/invalid-registration-token" ||
        sendError.code === "messaging/registration-token-not-registered"
      ) {
        removeInvalidToken(tokenData.token);
      }

      return { sent: 0, failed: 1 };
    }
  } catch (error) {
    console.error("❌ notifySession error:", error.message);
    return { sent: 0, failed: 0 };
  }
}

// -----------------------------------------------------------------
// Convenience: notify about a new message (targeted to receiver only)
// -----------------------------------------------------------------
function notifyNewMessage(item, conversationId, receiverSessionId) {
  const notification = {
    title: "💬 New Message",
    body: `You have received a new message about "${item.title || 'your lost item'}"`,
  };

  const data = {
    type: "message",
    itemId: item.id || "",
    conversationId: conversationId || "",
    templeId: item.templeId || "",
  };

  // Fire-and-forget — send ONLY to the receiver
  notifySession(receiverSessionId, notification, data).catch(
    (err) => console.error("Push notification error:", err.message)
  );
}

// -----------------------------------------------------------------
// Convenience: notify item owner about a new claim
// -----------------------------------------------------------------
function notifyClaimReceived(item, ownerSessionId) {
  const notification = {
    title: "📋 Someone claims they found your item",
    body: `A claim has been submitted for "${item.title || 'your lost item'}"`,
  };

  const data = {
    type: "claim-received",
    itemId: item.id || "",
    templeId: item.templeId || "",
  };

  notifySession(ownerSessionId, notification, data).catch(
    (err) => console.error("Push notification error:", err.message)
  );
}

// -----------------------------------------------------------------
// Convenience: notify finder about claim approval/rejection
// -----------------------------------------------------------------
function notifyClaimDecision(item, finderSessionId, approved) {
  const notification = {
    title: approved ? "✅ Your claim was approved!" : "❌ Your claim was rejected",
    body: approved
      ? `Your claim for "${item.title || 'a lost item'}" was approved. You can now view the location.`
      : `Your claim for "${item.title || 'a lost item'}" was rejected.`,
  };

  const data = {
    type: approved ? "claim-approved" : "claim-rejected",
    itemId: item.id || "",
    templeId: item.templeId || "",
  };

  notifySession(finderSessionId, notification, data).catch(
    (err) => console.error("Push notification error:", err.message)
  );
}

// -----------------------------------------------------------------
// Send notification DIRECTLY using a stored FCM token (bypasses session expiry)
// Used for owner priority notifications when session may have expired
// -----------------------------------------------------------------
async function notifyOwnerDirect(fcmToken, notification, data = {}) {
  if (!fcmToken) {
    console.log("📭 No owner FCM token provided — skipping direct notification");
    return { sent: 0, failed: 0 };
  }

  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      token: fcmToken,
    };

    await admin.messaging().send(message);
    console.log("🔔 Owner direct notification sent successfully");
    return { sent: 1, failed: 0 };
  } catch (error) {
    console.warn("⚠ Owner direct notification failed:", error.code || error.message);
    return { sent: 0, failed: 1 };
  }
}

// -----------------------------------------------------------------
// Convenience: notify item owner about a new claim (with priority)
// Tries session-based first; falls back to stored token on item
// Avoids duplicates by checking if session notification succeeded
// -----------------------------------------------------------------
async function notifyClaimReceivedPriority(item, ownerSessionId) {
  const notification = {
    title: "📋 Someone claims they found your item",
    body: `A claim has been submitted for "${item.title || 'your lost item'}"`,
  };

  const data = {
    type: "claim-received",
    itemId: item.id || "",
    templeId: item.templeId || "",
  };

  // Try session-based notification first (works if session still active)
  const sessionResult = await notifySession(ownerSessionId, notification, data).catch(
    (err) => { console.error("Push notification error:", err.message); return { sent: 0, failed: 0 }; }
  );

  // If session notification failed (expired session), use stored token
  if (sessionResult.sent === 0 && item.ownerNotificationToken) {
    console.log("📡 Session notification failed — using owner's stored token for priority delivery");
    notifyOwnerDirect(item.ownerNotificationToken, notification, data).catch(
      (err) => console.error("Owner direct notification error:", err.message)
    );
  }
}

module.exports = {
  notifyTemple,
  notifyNewLostItem,
  notifyItemFound,
  notifySession,
  notifyNewMessage,
  notifyClaimReceived,
  notifyClaimDecision,
  notifyOwnerDirect,
  notifyClaimReceivedPriority,
};

