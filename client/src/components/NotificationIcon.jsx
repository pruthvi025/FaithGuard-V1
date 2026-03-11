import { Bell } from 'lucide-react'
import { useNotificationCenter } from '../context/NotificationCenterContext'

export default function NotificationIcon({ className = '' }) {
  const { unreadCount, togglePanel } = useNotificationCenter()

  return (
    <button
      onClick={togglePanel}
      className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-6 h-6 text-[#475569]" strokeWidth={2} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-[#F59E0B] rounded-full border-2 border-white" />
      )}
      {unreadCount > 0 && unreadCount > 9 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 bg-[#F59E0B] text-white text-[10px] font-semibold rounded-full flex items-center justify-center border-2 border-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
