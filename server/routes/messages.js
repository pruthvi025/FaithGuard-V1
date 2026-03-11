// Message API Routes
// These routes will handle item-specific messaging via Firestore
// Currently scaffolded — will be connected to Firestore in the next phase

import express from 'express'

const router = express.Router()

// GET /api/messages/:itemId
// Get all messages for a specific item
router.get('/:itemId', (req, res) => {
  const { itemId } = req.params

  // TODO: Replace with Firestore query
  // const messagesRef = db.collection('messages')
  //   .where('itemId', '==', itemId)
  //   .orderBy('createdAt', 'asc')

  res.json({ messages: [], message: 'Firestore not connected yet' })
})

// POST /api/messages/:itemId
// Add a message to an item's chat
router.post('/:itemId', (req, res) => {
  const { itemId } = req.params
  const { text, senderSessionId, senderType } = req.body

  if (!text || !senderSessionId) {
    return res.status(400).json({ error: 'Missing required fields: text, senderSessionId' })
  }

  // TODO: Replace with Firestore create
  // const newMessage = {
  //   itemId,
  //   text: text.trim(),
  //   senderSessionId,
  //   senderType: senderType || 'other',
  //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
  // }
  // const docRef = await db.collection('messages').add(newMessage)

  res.status(201).json({ message: null, info: 'Firestore not connected yet' })
})

export default router
