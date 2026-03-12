import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { checkIn, pingSession } from '../services/sessionService'

const SessionContext = createContext(null)

const SESSION_KEY = 'faithguard_session'
const PING_INTERVAL_MS = 5 * 60 * 1000 // ping every 5 minutes

export function SessionProvider({ children }) {
  // Load session synchronously from localStorage so it's available on first render.
  // This prevents ProtectedRoute from redirecting to /checkin on page refresh.
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) return null
      const parsed = JSON.parse(stored)
      if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
        return parsed
      }
      localStorage.removeItem(SESSION_KEY)
      return null
    } catch {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
  })
  const pingTimerRef = useRef(null)

  // -------------------------------------------------------------------------
  // Expiry watchdog — checks every second, clears session when time runs out
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!session) return

    const watchdog = setInterval(() => {
      setSession((current) => {
        if (!current) return null
        if (current.expiresAt && new Date(current.expiresAt) <= new Date()) {
          localStorage.removeItem(SESSION_KEY)
          return null
        }
        return current
      })
    }, 1000)

    return () => clearInterval(watchdog)
  }, [session])

  // -------------------------------------------------------------------------
  // Heartbeat — pings backend periodically to keep session marked active
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current)

    if (!session?.sessionToken) return

    pingTimerRef.current = setInterval(async () => {
      const alive = await pingSession(session.sessionToken)
      if (!alive) {
        // Server rejected the ping — session no longer valid
        setSession(null)
        localStorage.removeItem(SESSION_KEY)
      }
    }, PING_INTERVAL_MS)

    return () => clearInterval(pingTimerRef.current)
  }, [session?.sessionToken])

  // -------------------------------------------------------------------------
  // createSession — calls the backend, stores the returned token
  // templeId: the temple identifier (from QR URL param or manual entry)
  // method: 'qr' | 'code'
  // -------------------------------------------------------------------------
  const createSession = async (templeId, method = 'code') => {
    try {
      const { sessionToken, expiresAt } = await checkIn(templeId)

      const newSession = {
        sessionToken,
        templeId,
        checkInMethod: method,
        createdAt: new Date().toISOString(),
        expiresAt,
        isActive: true,
      }

      setSession(newSession)
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
      return newSession
    } catch (err) {
      console.error('createSession error:', err)
      // Propagate the error — do NOT create a local fallback session
      // The backend validates temple codes, so invalid codes must be rejected
      throw err
    }
  }

  const clearSession = () => {
    setSession(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const isSessionValid = () => {
    if (!session) return false
    if (!session.isActive) return false
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      clearSession()
      return false
    }
    return true
  }

  // Kept for backwards compatibility — returns the templeId
  const getTempleCode = () => session?.templeId || null

  const getTimeUntilExpiry = () => {
    if (!session?.expiresAt) return null
    const diff = new Date(session.expiresAt) - new Date()
    return diff > 0 ? diff : 0
  }

  const value = {
    session,
    createSession,
    clearSession,
    isSessionValid,
    getTempleCode,
    getTimeUntilExpiry,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
