// ============================================
// Messages Controller
// ============================================
// Handles private 1:1 conversations per item via Firestore.
// Each conversation is isolated between two specific users.
// Collection: "messages"

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

/**
 * Generate a deterministic conversationId from itemId + two session IDs.
 * Sorting ensures both participants produce the same ID.
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
    // Fetch all messages for this item where the current user is involved
    const senderSnapshot = await db
      .collection("messages")
      .where("itemId", "==", itemId)
      .where("senderSessionId", "==", currentSessionId)
      .get();

    const receiverSnapshot = await db
      .collection("messages")
      .where("itemId", "==", itemId)
      .where("receiverSessionId", "==", currentSessionId)
      .get();

    // Merge results, keyed by conversationId
    const conversationMap = {};

    const processDoc = (doc) => {
      const data = { id: doc.id, ...doc.data() };
      const convId = data.conversationId;
      if (!convId) return; // skip old messages without conversationId

      if (!conversationMap[convId]) {
        // Determine the peer session ID
        const peerSessionId =
          data.senderSessionId === currentSessionId
            ? data.receiverSessionId
            : data.senderSessionId;

        conversationMap[convId] = {
          conversationId: convId,
          peerSessionId,
          lastMessage: data.text,
          lastMessageAt: data.createdAt,
          messageCount: 0,
        };
      }

      conversationMap[convId].messageCount++;

      // Track the latest message
      if (data.createdAt > conversationMap[convId].lastMessageAt) {
        conversationMap[convId].lastMessage = data.text;
        conversationMap[convId].lastMessageAt = data.createdAt;
      }
    };

    senderSnapshot.forEach(processDoc);
    receiverSnapshot.forEach(processDoc);

    // Convert to array and sort by most recent
    const conversations = Object.values(conversationMap).sort(
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
// Get messages for a specific 1:1 conversation
// -----------------------------------------------------------------
const getMessages = async (req, res) => {
  const { itemId, peerSessionId } = req.params;
  const currentSessionId = req.session.sessionId;

  const conversationId = buildConversationId(itemId, currentSessionId, peerSessionId);

  try {
    const snapshot = await db
      .collection("messages")
      .where("conversationId", "==", conversationId)
      .get();

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    // Sort by oldest first
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, messages });
  } catch (error) {
    console.error("❌ Get messages error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

// -----------------------------------------------------------------
// POST /api/messages/:itemId (protected)
// Add a message to a specific 1:1 conversation
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
    // Verify the item exists
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const conversationId = buildConversationId(itemId, session.sessionId, receiverSessionId);

    const messageId = uuidv4();
    const newMessage = {
      itemId,
      conversationId,
      senderSessionId: session.sessionId,
      receiverSessionId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("messages").doc(messageId).set(newMessage);

    console.log(`✅ Message added to conversation ${conversationId}`);

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
