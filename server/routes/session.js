// Session Routes - Temple Presence-Based Check-In System
// Handles QR-based anonymous session creation, verification, and heartbeat

import express from 'express'
import crypto from 'crypto'
import { db } from '../config/firebase-admin.js'

const router = express.Router()

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours

// ---------------------------------------------------------------------------
// POST /api/session/checkin
// Called when a user scans the temple QR code.
// Creates an anonymous session scoped to the templeId.
// ---------------------------------------------------------------------------
router.post('/checkin', async (req, res) => {
  const { templeId } = req.body

  if (!templeId || typeof templeId !== 'string' || !(templeId || '').trim()) {
    return res.status(400).json({ error: 'templeId is required' })
  }

  const sanitizedTempleId = (templeId || '').trim()

  try {
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

    const sessionData = {
      sessionId: sessionToken,
      templeId: sanitizedTempleId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      lastPingAt: now.toISOString(),
    }

    if (db) {
      await db.collection('sessions').doc(sessionToken).set(sessionData)
      console.log(`✅ Session created for temple: ${sanitizedTempleId}`)
    } else {
      // Firebase not configured — still return a token (dev / demo mode)
      console.warn('⚠️  Firebase not configured. Session stored in memory only.')
    }

    return res.status(201).json({
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err) {
    console.error('Session creation error:', err)
    return res.status(500).json({ error: 'Failed to create session' })
  }
})

// ---------------------------------------------------------------------------
// GET /api/session/verify
// Validates an existing session token.
// Header: Authorization: <sessionToken>
// ---------------------------------------------------------------------------
router.get('/verify', async (req, res) => {
  const token = req.headers['authorization']

  if (!token) {
    return res.status(401).json({ error: 'No session token provided' })
  }

  if (!db) {
    // Firebase not configured — cannot verify against DB
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    const doc = await db.collection('sessions').doc(token).get()

    if (!doc.exists) {
      return res.status(401).json({ error: 'Session not found' })
    }

    const session = doc.data()

    if (!session.isActive) {
      return res.status(401).json({ error: 'Session is inactive' })
    }

    if (new Date(session.expiresAt) <= new Date()) {
      await db.collection('sessions').doc(token).update({ isActive: false })
      return res.status(401).json({ error: 'Session expired' })
    }

    return res.json({
      valid: true,
      templeId: session.templeId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    })
  } catch (err) {
    console.error('Session verify error:', err)
    return res.status(500).json({ error: 'Failed to verify session' })
  }
})

// ---------------------------------------------------------------------------
// POST /api/session/ping
// Heartbeat to confirm the user is still active inside the temple.
// Header: Authorization: <sessionToken>
// ---------------------------------------------------------------------------
router.post('/ping', async (req, res) => {
  const token = req.headers['authorization']

  if (!token) {
    return res.status(401).json({ error: 'No session token provided' })
  }

  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  try {
    const doc = await db.collection('sessions').doc(token).get()

    if (!doc.exists) {
      return res.status(401).json({ error: 'Session not found' })
    }

    const session = doc.data()

    if (!session.isActive) {
      return res.status(401).json({ error: 'Session is inactive' })
    }

    if (new Date(session.expiresAt) <= new Date()) {
      await db.collection('sessions').doc(token).update({ isActive: false })
      return res.status(401).json({ error: 'Session expired' })
    }

    await db.collection('sessions').doc(token).update({
      lastPingAt: new Date().toISOString(),
    })

    return res.json({ ok: true, expiresAt: session.expiresAt })
  } catch (err) {
    console.error('Session ping error:', err)
    return res.status(500).json({ error: 'Failed to ping session' })
  }
})

export default router
