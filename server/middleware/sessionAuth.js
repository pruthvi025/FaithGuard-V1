// Session Auth Middleware
// Verifies that every protected request carries a valid, non-expired session token.
// Header expected: Authorization: <sessionToken>

import { db } from '../config/firebase-admin.js'

export async function requireSession(req, res, next) {
  const token = req.headers['authorization']

  if (!token) {
    return res.status(401).json({ error: 'Session token required' })
  }

  if (!db) {
    // Firebase not configured — allow through in dev mode
    req.session = { sessionId: token, templeId: 'dev_temple', isActive: true }
    return next()
  }

  try {
    const doc = await db.collection('sessions').doc(token).get()

    if (!doc.exists) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const session = doc.data()

    if (!session.isActive) {
      return res.status(401).json({ error: 'Session is inactive' })
    }

    if (new Date(session.expiresAt) <= new Date()) {
      await db.collection('sessions').doc(token).update({ isActive: false })
      return res.status(401).json({ error: 'Session expired. Please scan the QR code again.' })
    }

    // Attach verified session to request for downstream use
    req.session = session
    next()
  } catch (err) {
    console.error('Session auth middleware error:', err)
    return res.status(500).json({ error: 'Session verification failed' })
  }
}
