import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

export default function LandingPage() {
  console.log('🏠 LandingPage component rendering...')
  const navigate = useNavigate()

  const handleButtonClick = () => {
    console.log('Button clicked, navigating to /checkin')
    navigate('/checkin')
  }

  console.log('🏠 LandingPage about to return JSX...')
  return (
    <Layout show3D>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Admin quick access */}
        <div className="absolute top-4 right-4 z-20" style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => navigate('/admin/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#1E293B] shadow-md border border-gray-200 hover:border-[#F59E0B]/50 transition-all text-sm font-semibold"
          >
            <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
            Admin Login
          </button>
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FDE68A]/20 via-transparent to-[#FFF7ED] pointer-events-none" />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl w-full text-center space-y-8 relative z-10"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Brand logo + name */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center mb-6"
          >
            <div className="pointer-events-none mb-4 md:mb-5">
              <img
                src="/faithguard-logo.png"
                alt="FaithGuard logo"
                className="h-20 md:h-24 w-auto drop-shadow-sm"
                loading="lazy"
              />
            </div>
            <div className="mt-1">
              <p className="text-3xl md:text-4xl font-bold tracking-[0.14em] bg-gradient-to-r from-[#0F172A] via-[#111827] to-[#0F172A] bg-clip-text text-transparent">
                FaithGuard
              </p>
              <p className="text-xs md:text-sm text-[#6B7280] mt-1 tracking-[0.16em] uppercase">
                Community-Driven Lost &amp; Found
              </p>
            </div>
          </motion.div>

          {/* Temple Icon with glow effect */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-6"
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-28 h-28 md:w-32 md:h-32 text-[#F59E0B] relative"
            >
              <div className="absolute inset-0 blur-xl bg-[#F59E0B] opacity-20 rounded-full" />
              <svg 
                viewBox="0 0 100 100" 
                fill="currentColor"
                className="relative z-10 drop-shadow-lg"
              >
                <rect x="25" y="70" width="50" height="10" opacity="0.8"/>
                <rect x="30" y="50" width="40" height="20" opacity="0.85"/>
                <polygon points="50,20 40,45 60,45" opacity="0.9"/>
                <rect x="47.5" y="45" width="5" height="5" opacity="0.9"/>
                <polygon points="35,40 28,55 42,55" opacity="0.75"/>
                <polygon points="65,40 58,55 72,55" opacity="0.75"/>
                <path d="M 40 70 Q 50 60 60 70" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6"/>
                <circle cx="50" cy="25" r="2" opacity="0.7"/>
              </svg>
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-bold text-[#1E293B] mb-4 leading-tight"
          >
            Temple Lost & Found
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-[#475569] mb-12 leading-relaxed max-w-xl mx-auto"
          >
            A peaceful space to reconnect with what you've lost<br />
            on the temple grounds.
          </motion.p>

          {/* CTA Card */}
          <motion.div variants={itemVariants}>
            <Card className="mb-8 backdrop-blur-xl">
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-[#F59E0B]" />
                  <h2 className="text-2xl md:text-3xl font-semibold text-[#1E293B]">
                    Welcome to the Temple
                  </h2>
                </div>
                <p className="text-[#475569] leading-relaxed text-base md:text-lg">
                  If you lose something inside the temple,<br />
                  people around you can help.
                </p>
              </div>
            </Card>

            <div style={{ pointerEvents: 'auto' }}>
              <Button
                size="lg"
                onClick={handleButtonClick}
                className="w-full md:w-auto md:min-w-[300px] flex items-center justify-center gap-2 shadow-2xl mx-auto"
              >
                Enter Temple Grounds
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Trust Footer */}
          <motion.p
            variants={itemVariants}
            className="text-sm text-gray-400 mt-12"
          >
            No login • No tracking • Temporary access only
          </motion.p>
        </motion.div>
      </div>
    </Layout>
  )
}