import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from './SessionContext'
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  getFCMToken,
  getStoredFCMToken,
  clearFCMToken,
  setupForegroundMessageHandler,
} from '../services/notificationService'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { session, isSessionValid } = useSession()
  const [permission, setPermission] = useState('default')
  const [permissionChecked, setPermissionChecked] = useState(false)
  const [fcmToken, setFcmToken] = useState(null)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [foregroundNotification, setForegroundNotification] = useState(null)

  // Check notification support and permission status
  useEffect(() => {
    const checkPermission = async () => {
      if (await isNotificationSupported()) {
        setPermission(getNotificationPermission())
      } else {
        setPermission('unsupported')
      }
      setPermissionChecked(true)
    }
    checkPermission()
  }, [])

  // Set up foreground message handler
  useEffect(() => {
    const unsubscribe = setupForegroundMessageHandler((payload) => {
      // Show in-app notification when app is in foreground
      setForegroundNotification({
        title: payload.notification?.title || 'FaithGuard',
        body: payload.notification?.body || '',
        data: payload.data || {},
      })

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setForegroundNotification(null)
      }, 5000)
    })

    return unsubscribe
  }, [])

  // Load FCM token when session becomes active
  useEffect(() => {
    if (!session || !isSessionValid()) {
      // Clear token if session invalid
      clearFCMToken()
      setFcmToken(null)
      return
    }

    // Check if we already have a token for this session
    const storedToken = getStoredFCMToken(session.id, session.templeCode)
    if (storedToken) {
      setFcmToken(storedToken)
      return
    }

    // If permission is granted, get new token
    if (permission === 'granted') {
      getFCMToken(session.id, session.templeCode)
        .then((token) => {
          if (token) {
            setFcmToken(token)
          }
        })
        .catch((error) => {
          console.error('Error getting FCM token:', error)
        })
    }
  }, [session, permission, isSessionValid])

  // Clear token when session expires
  useEffect(() => {
    if (!session) {
      clearFCMToken()
      setFcmToken(null)
    }
  }, [session])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!(await isNotificationSupported())) {
      return 'unsupported'
    }

    setIsRequestingPermission(true)
    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      // If granted, get FCM token
      if (newPermission === 'granted' && session && isSessionValid()) {
        const token = await getFCMToken(session.id, session.templeCode)
        if (token) {
          setFcmToken(token)
        }
      }

      return newPermission
    } catch (error) {
      console.error('Error requesting permission:', error)
      return 'denied'
    } finally {
      setIsRequestingPermission(false)
      setShowPermissionModal(false)
    }
  }, [session, isSessionValid])

  // Dismiss foreground notification
  const dismissForegroundNotification = useCallback(() => {
    setForegroundNotification(null)
  }, [])

  const value = {
    permission,
    permissionChecked,
    fcmToken,
    isRequestingPermission,
    requestPermission,
    showPermissionModal,
    setShowPermissionModal,
    foregroundNotification,
    dismissForegroundNotification,
    isSupported: permission !== 'unsupported',
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
