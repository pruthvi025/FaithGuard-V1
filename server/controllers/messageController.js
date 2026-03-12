// ============================================
// Messages Controller
// ============================================
// Handles private 1:1 conversations per item via Firestore.
// Each conversation is isolated between two specific users.
//
// Firestore structure:
//   conversations/{conversationId}          — conversation metadata
//   conversations/{conversationId}/messages  — message subcollection

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { notifyNewMessage } = require("../services/pushNotificationService");

/**
 * Generate a deterministic conversationId from itemId + two session IDs.
 * Sorting ensures both participants produce the same ID.
 *
 * Example: item123_session45_session78
 */
function buildConversationId(itemId, sessionA, sessionB) {
  const sorted = [sessionA, sessionB].sort();
  return `${itemId}_${sorted[0]}_${sorted[1]}`;
}

// -----------------------------------------------------------------
// GET /api/messages/:itemId/conversations (protected)
// Get all conversation threads the current user has for an item.
// Returns a list of peers with last message preview.
// -----------------------------------------------------------------
const getConversations = async (req, res) => {
  const { itemId } = req.params;
  const currentSessionId = req.session.sessionId;

  try {
    // Query conversations where the current user is participantA
    const asASnapshot = await db
      .collection("conversations")
      .where("itemId", "==", itemId)
      .where("participantA", "==", currentSessionId)
      .get();

    // Query conversations where the current user is participantB
    const asBSnapshot = await db
      .collection("conversations")
      .where("itemId", "==", itemId)
      .where("participantB", "==", currentSessionId)
      .get();

    const conversations = [];

    const processConvDoc = (doc) => {
      const data = doc.data();
      const peerSessionId =
        data.participantA === currentSessionId
          ? data.participantB
          : data.participantA;

      conversations.push({
        conversationId: doc.id,
        peerSessionId,
        lastMessage: data.lastMessage || "",
        lastMessageAt: data.lastMessageAt || data.createdAt,
        messageCount: data.messageCount || 0,
      });
    };

    asASnapshot.forEach(processConvDoc);
    asBSnapshot.forEach(processConvDoc);

    // Sort by most recent message first
    conversations.sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    res.json({ success: true, conversations });
  } catch (error) {
    console.error("❌ Get conversations error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch conversations" });
  }
};

// -----------------------------------------------------------------
// GET /api/messages/:itemId/:peerSessionId (protected)
// Get messages for a specific 1:1 conversation (subcollection)
// -----------------------------------------------------------------
const getMessages = async (req, res) => {
  const { itemId, peerSessionId } = req.params;
  const currentSessionId = req.session.sessionId;

  const conversationId = buildConversationId(itemId, currentSessionId, peerSessionId);

  try {
    // Verify the current user is a participant (security check)
    const convDoc = await db.collection("conversations").doc(conversationId).get();

    if (convDoc.exists) {
      const convData = convDoc.data();
      if (
        convData.participantA !== currentSessionId &&
        convData.participantB !== currentSessionId
      ) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    }

    // Fetch messages from the subcollection
    const snapshot = await db
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get();

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, messages });
  } catch (error) {
    // If orderBy fails due to missing index, fallback to JS-side sort
    if (error.code === 9) {
      try {
        const snapshot = await db
          .collection("conversations")
          .doc(conversationId)
          .collection("messages")
          .get();

        const messages = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });

        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return res.json({ success: true, messages });
      } catch (fallbackError) {
        console.error("❌ Get messages fallback error:", fallbackError);
        return res.status(500).json({ success: false, error: "Failed to fetch messages" });
      }
    }

    console.error("❌ Get messages error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

// -----------------------------------------------------------------
// POST /api/messages/:itemId (protected)
// Add a message to a specific 1:1 conversation
// Creates the conversation document if it doesn't exist yet.
// -----------------------------------------------------------------
const addMessage = async (req, res) => {
  const { itemId } = req.params;
  const { text, receiverSessionId } = req.body;
  const session = req.session; // attached by verifySession middleware

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: "Message text is required",
    });
  }

  if (!receiverSessionId) {
    return res.status(400).json({
      success: false,
      error: "receiverSessionId is required",
    });
  }

  try {
    // Verify the item exists in either items or found_items collection
    let itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      itemDoc = await db.collection("found_items").doc(itemId).get();
    }
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const senderSessionId = session.sessionId;
    const conversationId = buildConversationId(itemId, senderSessionId, receiverSessionId);
    const now = new Date().toISOString();

    // 1. Check if conversation exists; if not, create it
    const convRef = db.collection("conversations").doc(conversationId);
    const convDoc = await convRef.get();

    if (!convDoc.exists) {
      // Determine participants — sorted order matches conversationId
      const sorted = [senderSessionId, receiverSessionId].sort();

      await convRef.set({
        conversationId,
        itemId,
        participantA: sorted[0],
        participantB: sorted[1],
        createdAt: now,
        lastMessage: text.trim(),
        lastMessageAt: now,
        messageCount: 1,
      });

      console.log(`✅ Conversation created: ${conversationId}`);
    } else {
      // Update conversation metadata
      await convRef.update({
        lastMessage: text.trim(),
        lastMessageAt: now,
        messageCount: (convDoc.data().messageCount || 0) + 1,
      });
    }

    // 2. Save message in the subcollection
    const messageId = uuidv4();
    const newMessage = {
      senderSessionId,
      receiverSessionId,
      text: text.trim(),
      timestamp: now,
    };

    await convRef.collection("messages").doc(messageId).set(newMessage);

    console.log(`✅ Message added to conversation ${conversationId}`);

    // 3. Send targeted push notification ONLY to the receiver
    const itemData = { id: itemId, ...itemDoc.data() };
    notifyNewMessage(itemData, conversationId, receiverSessionId);

    res.status(201).json({
      success: true,
      message: { id: messageId, ...newMessage },
    });
  } catch (error) {
    console.error("❌ Add message error:", error);
    res.status(500).json({ success: false, error: "Failed to add message" });
  }
};

module.exports = { getMessages, addMessage, getConversations };
