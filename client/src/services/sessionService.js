// Session Service — communicates with the backend session API
// Handles check-in, verification, and heartbeat (ping) for temple presence sessions.

const API_URL = import.meta.env.VITE_API_URL || ''

// POST /api/session/checkin
// Creates a new anonymous session for the given templeId.
// Returns { sessionToken, expiresAt }
export async function checkIn(templeId) {
  // Normalize temple ID — always lowercase, trimmed
  const normalizedTempleId = (templeId || "").trim().toLowerCase();

  const res = await fetch(`${API_URL}/api/session/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templeId: normalizedTempleId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Check-in failed')
  }

  return res.json() // { sessionToken, expiresAt }
}

// GET /api/session/verify
// Verifies whether a stored sessionToken is still valid.
// Returns { valid, templeId, expiresAt } or null if invalid/expired.
export async function verifySession(sessionToken) {
  try {
    const res = await fetch(`${API_URL}/api/session/verify`, {
      headers: { Authorization: sessionToken },
    })

    if (!res.ok) return null
    return res.json() // { valid, templeId, expiresAt }
  } catch {
    return null
  }
}

// POST /api/session/ping
// Heartbeat — confirms the user is still active inside the temple.
// Returns true if the session is alive, false otherwise.
export async function pingSession(sessionToken) {
  try {
    const res = await fetch(`${API_URL}/api/session/ping`, {
      method: 'POST',
      headers: { Authorization: sessionToken },
    })
    return res.ok
  } catch {
    return false
  }
}
