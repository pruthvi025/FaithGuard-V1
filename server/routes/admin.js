// Admin API Routes
// These routes will handle admin operations (authentication, case management)
// Currently scaffolded — will be connected to Firebase Auth + Firestore in the next phase

import express from 'express'

const router = express.Router()

// POST /api/admin/login
// Admin login — will verify Firebase Auth token
router.post('/login', (req, res) => {
  const { idToken } = req.body

  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' })
  }

  // TODO: Verify Firebase ID token
  // const decodedToken = await auth.verifyIdToken(idToken)
  // Check if user has admin custom claim
  // if (!decodedToken.admin) return res.status(403).json({ error: 'Not an admin' })

  res.json({ admin: null, message: 'Firebase Auth not connected yet' })
})

// GET /api/admin/items?templeCode=...
// Get all items including closed (admin view)
router.get('/items', (req, res) => {
  const { templeCode } = req.query

  if (!templeCode) {
    return res.status(400).json({ error: 'templeCode query parameter is required' })
  }

  // TODO: Replace with Firestore query (all items including closed)
  // const itemsRef = db.collection('items')
  //   .where('templeCode', '==', templeCode)
  //   .orderBy('createdAt', 'desc')

  res.json({ items: [], message: 'Firestore not connected yet' })
})

// PATCH /api/admin/items/:id/force-close
// Admin force-close a case
router.patch('/items/:id/force-close', (req, res) => {
  const { id } = req.params
  const { reason } = req.body

  // TODO: Verify admin token from Authorization header
  // TODO: Update item in Firestore
  // await db.collection('items').doc(id).update({
  //   status: 'closed',
  //   closedAt: admin.firestore.FieldValue.serverTimestamp(),
  //   adminClosedReason: reason || 'Force closed by admin',
  //   rewardAmount: null,
  // })

  res.json({ item: null, message: 'Firestore not connected yet' })
})

// PATCH /api/admin/items/:id/verify
// Admin verify/reject a disputed item claim
router.patch('/items/:id/verify', (req, res) => {
  const { id } = req.params
  const { action } = req.body // 'verify', 'reject', or 'desk'

  if (!action || !['verify', 'reject', 'desk'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be: verify, reject, or desk' })
  }

  // TODO: Update item dispute status in Firestore

  res.json({ item: null, message: 'Firestore not connected yet' })
})

export default router
