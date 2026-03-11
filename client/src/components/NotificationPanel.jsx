import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCheck } from 'lucide-react'
import { useNotificationCenter } from '../context/NotificationCenterContext'
import NotificationItem from './NotificationItem'

export default function NotificationPanel() {
  const { notifications, isPanelOpen, closePanel, markAllAsRead, clearAllNotifications, unreadCount } =
    useNotificationCenter()

  if (!isPanelOpen) return null

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePanel}
            className="fixed inset-0 bg-black/20 z-40"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-20 left-0 right-0 md:left-auto md:right-4 md:w-96 max-h-[calc(100vh-6rem)] bg-white rounded-b-2xl md:rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#1E293B]" />
                <h2 className="text-lg font-semibold text-[#1E293B]">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#F59E0B] text-white text-xs font-semibold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Mark all as read"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 text-[#64748B]" />
                  </button>
                )}
                <button
                  onClick={closePanel}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#475569] mb-1">
                    No notifications yet
                  </h3>
                  <p className="text-xs text-[#94A3B8] max-w-xs">
                    You'll see notifications about lost items, messages, and case updates here.
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer (optional - clear all button) */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={clearAllNotifications}
                  className="w-full text-xs text-[#64748B] hover:text-[#475569] transition-colors py-2"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
