import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Heart, Home, Sparkles, X } from 'lucide-react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'

export default function CaseClosed() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-radial from-[#F59E0B]/10 via-transparent to-transparent pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-2xl w-full text-center relative z-10"
        >
          <Card className="p-8 md:p-12 backdrop-blur-xl">
            {/* Close Icon (top-right) */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.2, 
                type: 'spring', 
                stiffness: 200,
                damping: 15
              }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 bg-green-400 rounded-full blur-2xl"
                />
                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-2xl">
                  <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl font-bold text-[#1E293B] mb-4"
            >
              You’ve Taken a Step to
              <br />
              Protect Someone’s Faith
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-[#475569] mb-8 leading-relaxed"
            >
              Thank you for helping reconnect this belonging with its owner.<br />
              <span className="font-semibold text-[#F59E0B]">Your care keeps the temple space peaceful and trustworthy.</span>
            </motion.p>

            {/* Gratitude Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="flex justify-center mb-8"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Heart className="w-20 h-20 text-[#F59E0B] fill-[#F59E0B] opacity-30" />
              </motion.div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                onClick={() => navigate('/home')}
                className="flex items-center justify-center gap-2 shadow-xl"
              >
                <Home className="w-5 h-5" />
                Return to Home
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/report')}
                className="shadow-lg"
              >
                <Sparkles className="w-5 h-5 mr-2 inline" />
                Report Another Item
              </Button>
            </motion.div>

            {/* Footer Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-sm text-gray-400 mt-10 italic font-medium"
            >
              Om Shanti Shanti Shanti
            </motion.p>
          </Card>
        </motion.div>
      </div>
    </Layout>
  )
}