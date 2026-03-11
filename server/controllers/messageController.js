// ============================================
// Messages Controller
// ============================================
// Handles item-specific messaging via Firestore.
// Collection: "messages"

const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// -----------------------------------------------------------------
// GET /api/messages/:itemId
// Get all messages for a specific item, ordered by createdAt
// -----------------------------------------------------------------
const getMessages = async (req, res) => {
  const { itemId } = req.params;

  try {
    const snapshot = await db
      .collection("messages")
      .where("itemId", "==", itemId)
      .get();

    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    // Sort by oldest first (JS-side to avoid composite index)
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, messages });
  } catch (error) {
    console.error("❌ Get messages error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
};

// -----------------------------------------------------------------
// POST /api/messages/:itemId (protected)
// Add a message to an item's chat
// -----------------------------------------------------------------
const addMessage = async (req, res) => {
  const { itemId } = req.params;
  const { text, senderType } = req.body;
  const session = req.session; // attached by verifySession middleware

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: "Message text is required",
    });
  }

  try {
    // Verify the item exists
    const itemDoc = await db.collection("items").doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    const messageId = uuidv4();
    const newMessage = {
      itemId,
      text: text.trim(),
      senderSessionId: session.sessionId,
      senderType: senderType || "other", // 'reporter' or 'other'
      createdAt: new Date().toISOString(),
    };

    await db.collection("messages").doc(messageId).set(newMessage);

    console.log(`✅ Message added to item ${itemId}`);

    res.status(201).json({
      success: true,
      message: { id: messageId, ...newMessage },
    });
  } catch (error) {
    console.error("❌ Add message error:", error);
    res.status(500).json({ success: false, error: "Failed to add message" });
  }
};

module.exports = { getMessages, addMessage };
