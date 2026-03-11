import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Plus, 
  Package, 
  Shield, 
  Clock, 
  CheckCircle2,
  Sparkles 
} from 'lucide-react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'
import NotificationPermissionModal from '../components/NotificationPermissionModal'
import NotificationToast from '../components/NotificationToast'
import { useSession } from '../context/SessionContext'
import { useNotifications } from '../context/NotificationContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

export default function HomePage() {
  const navigate = useNavigate()
  const { getTimeUntilExpiry, session } = useSession()
  const {
    permission,
    permissionChecked,
    showPermissionModal,
    setShowPermissionModal,
    requestPermission,
    foregroundNotification,
    dismissForegroundNotification,
    isSupported,
  } = useNotifications()
  const timeMs = getTimeUntilExpiry()
  const minutesLeft = timeMs != null ? Math.max(1, Math.round(timeMs / 60000)) : null
  const hasAttemptedToShowRef = useRef(false)

  // Show permission modal only once ever (not per session)
  useEffect(() => {
    // Don't show if no session or notifications not supported
    if (!session || !isSupported) return
    
    // Wait for permission to be checked
    if (!permissionChecked) return
    
    // Don't show if notifications are unsupported
    if (permission === 'unsupported') return

    // Don't attempt multiple times
    if (hasAttemptedToShowRef.current) return

    // Check if user has already seen the notification permission modal
    const hasSeenNotificationModal = localStorage.getItem('faithguard_notification_modal_seen')
    
    // If user has already seen it, don't show again
    if (hasSeenNotificationModal === 'true') {
      hasAttemptedToShowRef.current = true
      return
    }

    // Only show if permission is 'default' (not yet asked)
    // If permission is already 'granted' or 'denied', user has already interacted with browser prompt
    // In that case, we don't need to show our modal
    if (permission !== 'default') {
      hasAttemptedToShowRef.current = true
      return
    }

    // Mark that we've attempted to show
    hasAttemptedToShowRef.current = true

    // Small delay to let the page load smoothly
    const timer = setTimeout(() => {
      // Double-check conditions haven't changed during the delay
      const stillHasSeen = localStorage.getItem('faithguard_notification_modal_seen')
      if (!stillHasSeen) {
        setShowPermissionModal(true)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [session, isSupported, permission, permissionChecked, setShowPermissionModal])

  // Reset the ref when session changes (new login)
  useEffect(() => {
    if (session) {
      hasAttemptedToShowRef.current = false
    }
  }, [session?.id])

  const handleEnableNotifications = async () => {
    await requestPermission()
    // Mark as seen so it doesn't show again
    localStorage.setItem('faithguard_notification_modal_seen', 'true')
  }

  const handleSkipNotifications = () => {
    setShowPermissionModal(false)
    // Mark as seen so it doesn't show again
    localStorage.setItem('faithguard_notification_modal_seen', 'true')
  }

  return (
    <Layout>
      <div className="min-h-screen pb-20 px-4 py-8 md:py-12 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDE68A]/15 via-transparent to-[#FFF7ED] pointer-events-none" />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto relative z-10"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Status / Check-in Card */}
          <motion.div
            variants={itemVariants}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-white/95 to-white/90 flex items-center gap-4 md:gap-6">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#FDBA74]/25 to-[#F59E0B]/25 flex items-center justify-center shadow-md flex-shrink-0">
                <Sparkles className="w-8 h-8 md:w-9 md:h-9 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-[#F97316] font-semibold mb-1">
                  Checked-in successfully
                </p>
                <h1 className="text-xl md:text-2xl font-bold text-[#1E293B]">
                  You are inside the temple
                </h1>
                <p className="text-xs md:text-sm text-[#475569] mt-1">
                  Session is active. You can report or find items anonymously.
                  {minutesLeft != null && (
                    <span className="ml-1 text-[#9CA3AF]">
                      (~{minutesLeft} min remaining)
                    </span>
                  )}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Primary Action Area */}
          <motion.div
            variants={itemVariants}
            className="grid md:grid-cols-2 gap-6 mb-8"
          >
            {/* Report Lost Item Card */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                onClick={() => navigate('/report')}
                className="h-full cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center space-y-5 p-2">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#FDBA74]/30 to-[#F59E0B]/30 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow"
                  >
                    <Search className="w-10 h-10 md:w-12 md:h-12 text-[#F59E0B]" strokeWidth={2} />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-3 uppercase tracking-tight">
                      I Lost Something
                    </h2>
                    <p className="text-[#475569] text-base md:text-lg leading-relaxed">
                      Report a missing item and the temple community will help you look for it.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/report')
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2 inline" />
                    Report Lost Item
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* View Lost Items Card */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                onClick={() => navigate('/feed')}
                className="h-full cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center space-y-5 p-2">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#FDBA74]/30 to-[#F59E0B]/30 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow"
                  >
                    <Package className="w-10 h-10 md:w-12 md:h-12 text-[#F59E0B]" strokeWidth={2} />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-3 uppercase tracking-tight">
                      I Found Something
                    </h2>
                    <p className="text-[#475569] text-base md:text-lg leading-relaxed">
                      See if someone has reported this item, or add it to the found list.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/feed')
                    }}
                  >
                    Browse Items
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Secondary Action Area */}
          <motion.div
            variants={itemVariants}
            className="mb-10"
          >
            {/* Found an Item Card */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                onClick={() => navigate('/feed')}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
                    <Package className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#1E293B] mb-1">
                      Found an Item?
                    </h3>
                    <p className="text-sm text-[#475569]">
                      Help someone recover their belongings
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Status / Trust Strip */}
          <motion.div
            variants={itemVariants}
            className="mb-10"
          >
            <Card className="bg-gradient-to-r from-white/90 to-white/70">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Session Active */}
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3"
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </motion.div>
                  <h4 className="font-semibold text-[#1E293B] mb-1">Session Active</h4>
                  <p className="text-xs text-[#475569]">You're checked in</p>
                </div>

                {/* Privacy First */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                  <h4 className="font-semibold text-[#1E293B] mb-1">Privacy First</h4>
                  <p className="text-xs text-[#475569]">No tracking, no data</p>
                </div>

                {/* Temporary Access */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-[#1E293B] mb-1">Temporary Access</h4>
                  <p className="text-xs text-[#475569]">Expires when you leave</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-gray-400 font-medium"
          >
            Community • Trust • Integrity
          </motion.p>
        </motion.div>
      </div>
      <BottomNav />

      {/* Notification Permission Modal */}
      <NotificationPermissionModal
        isOpen={showPermissionModal}
        onEnable={handleEnableNotifications}
        onSkip={handleSkipNotifications}
      />

      {/* Foreground Notification Toast */}
      <NotificationToast
        notification={foregroundNotification}
        onDismiss={dismissForegroundNotification}
      />
    </Layout>
  )
}