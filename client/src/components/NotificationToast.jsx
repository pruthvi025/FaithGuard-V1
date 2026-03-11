import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotificationToast({ notification, onDismiss }) {
  const navigate = useNavigate()

  if (!notification) return null

  const handleClick = () => {
    if (notification.data?.itemId) {
      navigate(`/item/${notification.data.itemId}`)
    } else {
      navigate('/feed')
    }
    onDismiss()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden cursor-pointer"
          onClick={handleClick}
        >
          <div className="p-4 flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FDBA74]/30 to-[#F59E0B]/30 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-[#F59E0B]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[#1E293B] mb-1">
                {notification.title}
              </h4>
              <p className="text-xs text-[#475569] line-clamp-2">
                {notification.body}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
