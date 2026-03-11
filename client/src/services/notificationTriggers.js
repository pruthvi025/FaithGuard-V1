// Notification Triggers Service
// This service handles triggering notifications for lost & found events
//
// NOTE: In production, notifications should be sent server-side using:
// - Firebase Cloud Functions
// - Backend API endpoints
// - FCM Admin SDK
//
// This client-side service provides the structure and event emission.
// The actual FCM message sending should happen server-side.

import { getActiveTokensForTemple } from './notificationService'

/**
 * Trigger notification when a new lost item is reported
 * In production, this would call a Cloud Function or API endpoint
 */
export async function notifyNewLostItem(item, templeCode) {
  // In production, this would:
  // 1. Call Cloud Function or API endpoint
  // 2. Server queries active FCM tokens for this temple
  // 3. Server sends notification to all active tokens (except reporter's)
  
  console.log('[Notification] New lost item reported:', item.id)
  
  // For client-side simulation, we emit a custom event
  // In production, remove this and use server-side notifications
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('faithguard:new-lost-item', {
        detail: { item, templeCode },
      })
    )
  }
}

/**
 * Trigger notification when an item is marked as found
 * Notifies the original reporter
 */
export async function notifyItemFound(item, templeCode) {
  console.log('[Notification] Item marked as found:', item.id)
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('faithguard:item-found', {
        detail: { item, templeCode },
      })
    )
  }
}

/**
 * Trigger notification when case status changes (FOUND/CLOSED)
 */
export async function notifyCaseStatusChange(item, newStatus, templeCode) {
  console.log('[Notification] Case status changed:', item.id, newStatus)
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('faithguard:case-status-change', {
        detail: { item, newStatus, templeCode },
      })
    )
  }
}

/**
 * Trigger notification when someone responds to an item (sends a message)
 */
export async function notifyNewMessage(item, message, templeCode) {
  console.log('[Notification] New message on item:', item.id)
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('faithguard:new-message', {
        detail: { item, message, templeCode },
      })
    )
  }
}

/**
 * Get notification payload for new lost item
 */
export function getNewLostItemNotification(item) {
  return {
    title: 'Lost item reported nearby',
    body: `${item.title} was reported at ${item.location}`,
    data: {
      itemId: item.id,
      type: 'new-lost-item',
      templeCode: item.templeCode,
    },
  }
}

/**
 * Get notification payload for item found
 */
export function getItemFoundNotification(item) {
  return {
    title: 'Someone found your item',
    body: `Good news! Someone found "${item.title}"`,
    data: {
      itemId: item.id,
      type: 'item-found',
      templeCode: item.templeCode,
    },
  }
}

/**
 * Get notification payload for case status change
 */
export function getCaseStatusChangeNotification(item, newStatus) {
  const statusMessages = {
    found: 'Your item has been marked as found',
    closed: 'Case closed',
  }

  return {
    title: statusMessages[newStatus] || 'Case status updated',
    body: `${item.title} status changed to ${newStatus}`,
    data: {
      itemId: item.id,
      type: 'case-status-change',
      status: newStatus,
      templeCode: item.templeCode,
    },
  }
}

/**
 * Get notification payload for new message
 */
export function getNewMessageNotification(item, message) {
  return {
    title: 'New message about your item',
    body: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
    data: {
      itemId: item.id,
      type: 'new-message',
      messageId: message.id,
      templeCode: item.templeCode,
    },
  }
}
