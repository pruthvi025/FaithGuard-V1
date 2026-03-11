import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from './SessionContext'

const NotificationCenterContext = createContext(null)

const NOTIFICATION_STORAGE_KEY = 'faithguard_notifications'

// Notification types
export const NOTIFICATION_TYPES = {
  NEW_LOST_ITEM: 'new-lost-item',
  ITEM_FOUND: 'item-found',
  CASE_STATUS_CHANGE: 'case-status-change',
  NEW_MESSAGE: 'new-message',
}

// Notification type icons and colors
export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.NEW_LOST_ITEM]: {
    icon: 'Package',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  [NOTIFICATION_TYPES.ITEM_FOUND]: {
    icon: 'CheckCircle2',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  [NOTIFICATION_TYPES.CASE_STATUS_CHANGE]: {
    icon: 'CheckCircle2',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  [NOTIFICATION_TYPES.NEW_MESSAGE]: {
    icon: 'MessageCircle',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
}

/**
 * Load notifications from localStorage for current session
 */
function loadNotificationsFromStorage(sessionId, templeCode) {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (!stored) return []
    
    const allNotifications = JSON.parse(stored)
    // Filter by session and temple
    return allNotifications.filter(
      (notif) => notif.sessionId === sessionId && notif.templeCode === templeCode
    )
  } catch (e) {
    return []
  }
}

/**
 * Save notifications to localStorage
 */
function saveNotificationsToStorage(notifications) {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
  } catch (e) {
    console.error('Failed to save notifications:', e)
  }
}

/**
 * Generate unique notification ID
 */
function generateNotificationId() {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function NotificationCenterProvider({ children }) {
  const { session, getTempleCode } = useSession()
  const [notifications, setNotifications] = useState([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Load notifications when session changes
  useEffect(() => {
    if (!session) {
      setNotifications([])
      return
    }

    const templeCode = getTempleCode()
    if (!templeCode) return

    const loaded = loadNotificationsFromStorage(session.id, templeCode)
    setNotifications(loaded.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  }, [session?.id, getTempleCode])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!session) return

    // Merge with existing notifications from other sessions
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      const existing = stored ? JSON.parse(stored) : []
      
      // Remove notifications from this session/temple
      const otherNotifications = existing.filter(
        (notif) => !(notif.sessionId === session.id && notif.templeCode === getTempleCode())
      )
      
      // Add current notifications
      const allNotifications = [...otherNotifications, ...notifications]
      saveNotificationsToStorage(allNotifications)
    } catch (e) {
      console.error('Failed to save notifications:', e)
    }
  }, [notifications, session, getTempleCode])

  // Clear notifications when session expires
  useEffect(() => {
    if (!session) {
      setNotifications([])
      setIsPanelOpen(false)
    }
  }, [session])

  /**
   * Add a new notification
   */
  const addNotification = useCallback(
    (notification) => {
      if (!session) return

      const templeCode = getTempleCode()
      if (!templeCode) return

      const newNotification = {
        id: generateNotificationId(),
        type: notification.type || NOTIFICATION_TYPES.NEW_LOST_ITEM,
        title: notification.title || 'Notification',
        body: notification.body || '',
        itemId: notification.itemId || null,
        data: notification.data || {},
        read: false,
        sessionId: session.id,
        templeCode: templeCode,
        createdAt: new Date().toISOString(),
      }

      setNotifications((prev) => [newNotification, ...prev])
    },
    [session, getTempleCode]
  )

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
    )
  })

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
  })

  /**
   * Remove notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId))
  })

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  })

  /**
   * Get unread count
   */
  const unreadCount = notifications.filter((notif) => !notif.read).length

  /**
   * Toggle panel
   */
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev)
  })

  /**
   * Close panel
   */
  const closePanel = useCallback(() => {
    setIsPanelOpen(false)
  })

  const value = {
    notifications,
    unreadCount,
    isPanelOpen,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    togglePanel,
    closePanel,
  }

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  )
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext)
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationCenterProvider')
  }
  return context
}
