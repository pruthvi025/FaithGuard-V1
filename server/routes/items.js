// Item API Routes
// These routes will handle item CRUD operations via Firestore
// Currently scaffolded — will be connected to Firestore in the next phase

import express from 'express'

const router = express.Router()

// GET /api/items?templeCode=TEMPLE_001
// Get all items for a temple (excludes closed by default)
router.get('/', (req, res) => {
  const { templeCode, includesClosed } = req.query

  if (!templeCode) {
    return res.status(400).json({ error: 'templeCode query parameter is required' })
  }

  // TODO: Replace with Firestore query
  // const itemsRef = db.collection('items')
  //   .where('templeCode', '==', templeCode)
  //   .orderBy('createdAt', 'desc')
  
  res.json({ items: [], message: 'Firestore not connected yet' })
})

// GET /api/items/:id
// Get single item by ID
router.get('/:id', (req, res) => {
  const { id } = req.params

  // TODO: Replace with Firestore query
  // const doc = await db.collection('items').doc(id).get()

  res.json({ item: null, message: 'Firestore not connected yet' })
})

// POST /api/items
// Create a new lost item report
router.post('/', (req, res) => {
  const { title, description, location, image, rewardAmount, templeCode, sessionId } = req.body

  if (!title || !description || !location || !templeCode || !sessionId) {
    return res.status(400).json({ error: 'Missing required fields: title, description, location, templeCode, sessionId' })
  }

  // TODO: Replace with Firestore create
  // const newItem = {
  //   title, description, location, image,
  //   rewardAmount: rewardAmount || null,
  //   status: 'active',
  //   templeCode,
  //   reporterSessionId: sessionId,
  //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
  //   updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  //   foundBySessionId: null,
  //   closedAt: null,
  //   rewardGiven: false,
  // }
  // const docRef = await db.collection('items').add(newItem)

  res.status(201).json({ item: null, message: 'Firestore not connected yet' })
})

// PATCH /api/items/:id/status
// Update item status (active → found → closed)
router.patch('/:id/status', (req, res) => {
  const { id } = req.params
  const { status, sessionId } = req.body

  if (!status || !['active', 'found', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: active, found, or closed' })
  }

  // TODO: Replace with Firestore update
  // await db.collection('items').doc(id).update({
  //   status,
  //   updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  //   ...(status === 'found' && sessionId ? { foundBySessionId: sessionId } : {}),
  //   ...(status === 'closed' ? { closedAt: admin.firestore.FieldValue.serverTimestamp(), rewardAmount: null } : {}),
  // })

  res.json({ item: null, message: 'Firestore not connected yet' })
})

// PATCH /api/items/:id
// General item update (e.g., remove reward)
router.patch('/:id', (req, res) => {
  const { id } = req.params
  const updates = req.body

  // TODO: Replace with Firestore update
  // await db.collection('items').doc(id).update({
  //   ...updates,
  //   updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  // })

  res.json({ item: null, message: 'Firestore not connected yet' })
})

// GET /api/items/search?templeCode=...&q=...
// Search items by title, description, or location
router.get('/search', (req, res) => {
  const { templeCode, q } = req.query

  if (!templeCode) {
    return res.status(400).json({ error: 'templeCode query parameter is required' })
  }

  // TODO: Replace with Firestore query (client-side filtering for now)

  res.json({ items: [], message: 'Firestore not connected yet' })
})

export default router
