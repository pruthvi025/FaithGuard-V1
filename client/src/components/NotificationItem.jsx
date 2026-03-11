import { motion } from 'framer-motion'
import { Package, CheckCircle2, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotificationCenter, NOTIFICATION_CONFIG } from '../context/NotificationCenterContext'

const iconMap = {
  Package,
  CheckCircle2,
  MessageCircle,
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
}

export default function NotificationItem({ notification }) {
  const navigate = useNavigate()
  const { markAsRead, closePanel } = useNotificationCenter()

  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.newLostItem
  const Icon = iconMap[config.icon] || Package

  const handleClick = () => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Close panel
    closePanel()

    // Navigate to relevant screen
    if (notification.itemId) {
      navigate(`/item/${notification.itemId}`)
    } else {
      navigate('/feed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
        notification.read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-orange-50/50 hover:bg-orange-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold mb-1 ${notification.read ? 'text-[#475569]' : 'text-[#1E293B]'}`}>
            {notification.title}
          </h4>
          <p className="text-xs text-[#64748B] line-clamp-1 mb-2">
            {notification.body}
          </p>
          <span className="text-[10px] text-[#94A3B8]">
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="w-2 h-2 bg-[#F59E0B] rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  )
}
