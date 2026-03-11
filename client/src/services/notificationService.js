// Notification Service - Handles FCM token management and notification sending
// Privacy-first: tokens are session-bound and expire with sessions

import { messaging } from '../config/firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { isSupported } from 'firebase/messaging'

const TOKEN_STORAGE_KEY = 'faithguard_fcm_token'
const TOKEN_TEMPLECODE_KEY = 'faithguard_fcm_templecode'
const TOKEN_SESSIONID_KEY = 'faithguard_fcm_sessionid'

// VAPID key - This should be generated in Firebase Console
// Project Settings > Cloud Messaging > Web Push certificates
// Generate a key pair if you don't have one
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || ''

/**
 * Check if notifications are supported in this browser
 */
export async function isNotificationSupported() {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (!('serviceWorker' in navigator)) return false

  try {
    return await isSupported()
  } catch (error) {
    return false
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (!(await isNotificationSupported())) {
    return 'unsupported'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission // 'granted', 'denied', or 'default'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Register service worker for notifications
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })
    console.log('Service Worker registered successfully:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Get FCM token for the current session
 * Only generates token if permission is granted and session is active
 */
export async function getFCMToken(sessionId, templeCode) {
  if (!(await isNotificationSupported())) {
    return null
  }

  if (!messaging) {
    console.warn('Firebase Messaging not initialized')
    return null
  }

  const permission = getNotificationPermission()
  if (permission !== 'granted') {
    return null
  }

  try {
    // Register service worker first
    await registerServiceWorker()

    // Request token from FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    })

    if (token) {
      // Cache locally for quick lookups
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      localStorage.setItem(TOKEN_TEMPLECODE_KEY, templeCode)
      localStorage.setItem(TOKEN_SESSIONID_KEY, sessionId)

      // Register token with backend (Firestore)
      await registerTokenWithBackend(token, sessionId)

      console.log('FCM Token obtained and registered:', token.substring(0, 20) + '...')
      return token
    } else {
      console.warn('No FCM token available')
      return null
    }
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

/**
 * Get stored FCM token (if valid for current session)
 */
export function getStoredFCMToken(sessionId, templeCode) {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const storedSessionId = localStorage.getItem(TOKEN_SESSIONID_KEY)
  const storedTempleCode = localStorage.getItem(TOKEN_TEMPLECODE_KEY)

  // Token is only valid if it matches current session and temple
  if (
    storedToken &&
    storedSessionId === sessionId &&
    storedTempleCode === templeCode
  ) {
    return storedToken
  }

  return null
}

/**
 * Clear FCM token (on session expiry or logout)
 */
export async function clearFCMToken() {
  // Remove from backend first
  try {
    const sessionToken = getSessionToken()
    if (sessionToken) {
      await fetch(`${API_URL}/api/notifications/token`, {
        method: 'DELETE',
        headers: { 'session-id': sessionToken },
      })
      console.log('FCM token removed from backend')
    }
  } catch (error) {
    console.warn('Could not remove token from backend:', error.message)
  }

  // Clear local cache
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_TEMPLECODE_KEY)
  localStorage.removeItem(TOKEN_SESSIONID_KEY)
}

/**
 * Set up foreground message handler
 * This handles notifications when the app is in the foreground
 */
export function setupForegroundMessageHandler(callback) {
  if (!messaging) {
    return () => {}
  }

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload)
      if (callback) {
        callback(payload)
      }
    })

    return unsubscribe
  } catch (error) {
    console.error('Error setting up foreground message handler:', error)
    return () => {}
  }
}

/**
 * Get all active FCM tokens for a temple
 * In production, this would query Firestore for active session tokens
 * For now, we simulate this using localStorage (for demo purposes)
 */
export async function getActiveTokensForTemple(templeCode) {
  try {
    const res = await fetch(`${API_URL}/api/notifications/tokens/${encodeURIComponent(templeCode)}`)
    const data = await res.json()

    if (data.success && Array.isArray(data.tokens)) {
      return data.tokens
    }
  } catch (error) {
    console.warn('Could not fetch tokens from backend:', error.message)
  }

  // Fallback to local token if backend unreachable
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const storedTempleCode = localStorage.getItem(TOKEN_TEMPLECODE_KEY)

  if (storedToken && storedTempleCode === templeCode) {
    return [storedToken]
  }

  return []
}

// -----------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL || ''

function getSessionToken() {
  try {
    const stored = localStorage.getItem('faithguard_session')
    if (!stored) return null
    return JSON.parse(stored).sessionToken || null
  } catch {
    return null
  }
}

/**
 * Register FCM token with the backend API.
 * Backend stores it in Firestore `fcm_tokens` collection.
 */
async function registerTokenWithBackend(token, sessionId) {
  try {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      console.warn('No session token — cannot register FCM token with backend')
      return
    }

    const res = await fetch(`${API_URL}/api/notifications/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'session-id': sessionToken,
      },
      body: JSON.stringify({ token }),
    })

    const data = await res.json()

    if (data.success) {
      console.log('✅ FCM token registered with backend')
    } else {
      console.warn('Backend token registration failed:', data.error)
    }
  } catch (error) {
    console.warn('Could not register token with backend:', error.message)
  }
}
