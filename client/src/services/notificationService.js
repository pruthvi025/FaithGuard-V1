// Notification Service - Handles FCM token management and notification sending
// Privacy-first: tokens are session-bound and expire with sessions

import { getMessagingInstance } from '../config/firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { isSupported } from 'firebase/messaging'

const TOKEN_STORAGE_KEY = 'faithguard_fcm_token'
const TOKEN_TEMPLECODE_KEY = 'faithguard_fcm_templecode'
const TOKEN_SESSIONID_KEY = 'faithguard_fcm_sessionid'

// VAPID key - This should be generated in Firebase Console
// Project Settings > Cloud Messaging > Web Push certificates
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
 * Register service worker for notifications.
 * Waits for the SW to become active before returning.
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })

    // Wait for SW to become active (critical for background notifications)
    if (registration.installing) {
      await new Promise((resolve) => {
        registration.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') resolve()
        })
      })
    } else if (registration.waiting) {
      await new Promise((resolve) => {
        registration.waiting.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') resolve()
        })
      })
    }

    console.log('Service Worker registered & active:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Get FCM token for the current session.
 * Passes the SW registration to getToken so FCM binds to the service worker
 * — this is the critical fix for background delivery.
 */
export async function getFCMToken(sessionId, templeCode) {
  if (!(await isNotificationSupported())) {
    return null
  }

  const permission = getNotificationPermission()
  if (permission !== 'granted') {
    return null
  }

  try {
    // 1. Register service worker AND wait for it to be active
    const swRegistration = await registerServiceWorker()

    // 2. Get messaging instance (async — ensures it's initialized)
    const msg = await getMessagingInstance()
    if (!msg) {
      console.warn('Firebase Messaging not available')
      return null
    }

    // 3. Request token — pass serviceWorkerRegistration so FCM can use it
    //    for background message delivery
    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
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
 * Set up foreground message handler.
 * Uses the async messaging getter to ensure initialization.
 */
export function setupForegroundMessageHandler(callback) {
  // Start async setup, return a cleanup function
  let unsubscribeFn = () => {}

  getMessagingInstance().then((msg) => {
    if (!msg) return

    try {
      unsubscribeFn = onMessage(msg, (payload) => {
        console.log('Foreground message received:', payload)
        if (callback) {
          callback(payload)
        }
      })
    } catch (error) {
      console.error('Error setting up foreground message handler:', error)
    }
  })

  return () => unsubscribeFn()
}

/**
 * Get all active FCM tokens for a temple
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
