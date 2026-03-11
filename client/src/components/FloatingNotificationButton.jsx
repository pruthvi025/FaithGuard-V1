import { motion } from 'framer-motion'
import NotificationIcon from './NotificationIcon'
import NotificationPanel from './NotificationPanel'

export default function FloatingNotificationButton() {
  return (
    <>
      {/* Floating notification button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed top-4 right-4 z-30"
      >
        <div className="bg-white/95 backdrop-blur rounded-full shadow-lg border border-gray-200 p-1">
          <NotificationIcon className="hover:bg-gray-100" />
        </div>
      </motion.div>
      
      {/* Notification Panel */}
      <NotificationPanel />
    </>
  )
}
