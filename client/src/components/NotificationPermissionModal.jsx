import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle2 } from 'lucide-react'
import Button from './Button'
import Card from './Card'

export default function NotificationPermissionModal({ isOpen, onEnable, onSkip }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onSkip}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="relative">
                {/* Close button */}
                <button
                  onClick={onSkip}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-6 pt-8">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FDBA74]/30 to-[#F59E0B]/30 flex items-center justify-center">
                      <Bell className="w-10 h-10 text-[#F59E0B]" />
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-[#1E293B] text-center mb-3">
                    Stay Updated
                  </h2>

                  {/* Description */}
                  <p className="text-[#475569] text-center mb-6 leading-relaxed">
                    Get alerts if someone finds your item or posts a lost item nearby.
                  </p>

                  {/* Benefits */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">Real-time alerts</p>
                        <p className="text-xs text-[#64748B]">
                          Know immediately when there's activity on your items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">Privacy-first</p>
                        <p className="text-xs text-[#64748B]">
                          Notifications expire with your session
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">Temple-only</p>
                        <p className="text-xs text-[#64748B]">
                          Only receive notifications for your current temple
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={onEnable}
                      className="w-full"
                    >
                      Enable Notifications
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={onSkip}
                      className="w-full"
                    >
                      Skip
                    </Button>
                  </div>

                  {/* Privacy note */}
                  <p className="text-xs text-center text-gray-400 mt-4">
                    You can change this later in your browser settings
                  </p>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
