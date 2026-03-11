// Notification Center Helpers
// Frontend-only helpers for adding notifications to the in-app notification center
// These are mock/UI notifications (not real push notifications)

import { NOTIFICATION_TYPES } from '../context/NotificationCenterContext'

/**
 * Helper to add a notification to the notification center
 * This should be called from notification triggers or components
 */
export function addNotificationToCenter(addNotification, notification) {
  if (!addNotification) {
    console.warn('addNotification function not available')
    return
  }

  addNotification(notification)
}

/**
 * Add notification when new lost item is reported
 */
export function notifyNewLostItemToCenter(addNotification, item, templeCode) {
  addNotificationToCenter(addNotification, {
    type: NOTIFICATION_TYPES.NEW_LOST_ITEM,
    title: 'Lost item reported nearby',
    body: `${item.title} was reported at ${item.location}`,
    itemId: item.id,
    data: {
      type: 'new-lost-item',
      templeCode: templeCode,
    },
  })
}

/**
 * Add notification when item is marked as found
 */
export function notifyItemFoundToCenter(addNotification, item, templeCode) {
  addNotificationToCenter(addNotification, {
    type: NOTIFICATION_TYPES.ITEM_FOUND,
    title: 'Someone found your item',
    body: `Good news! Someone found "${item.title}"`,
    itemId: item.id,
    data: {
      type: 'item-found',
      templeCode: templeCode,
    },
  })
}

/**
 * Add notification when case status changes
 */
export function notifyCaseStatusChangeToCenter(addNotification, item, newStatus, templeCode) {
  const statusMessages = {
    found: 'Your item has been marked as found',
    closed: 'Case closed successfully',
  }

  addNotificationToCenter(addNotification, {
    type: NOTIFICATION_TYPES.CASE_STATUS_CHANGE,
    title: statusMessages[newStatus] || 'Case status updated',
    body: `${item.title} status changed to ${newStatus}`,
    itemId: item.id,
    data: {
      type: 'case-status-change',
      status: newStatus,
      templeCode: templeCode,
    },
  })
}

/**
 * Add notification when new message is received
 */
export function notifyNewMessageToCenter(addNotification, item, message, templeCode) {
  addNotificationToCenter(addNotification, {
    type: NOTIFICATION_TYPES.NEW_MESSAGE,
    title: 'New message about your item',
    body: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
    itemId: item.id,
    data: {
      type: 'new-message',
      messageId: message.id,
      templeCode: templeCode,
    },
  })
}
