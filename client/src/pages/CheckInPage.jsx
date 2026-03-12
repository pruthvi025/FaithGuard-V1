import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QrCode, Key, CheckCircle2, ArrowRight, Loader2, AlertCircle, Camera } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import QRScanner from '../components/QRScanner'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

export default function CheckInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { createSession, isSessionValid } = useSession()

  // templeId from QR URL param e.g. /checkin?templeId=temple_001
  const qrTempleId = searchParams.get('templeId')

  const [selectedMethod, setSelectedMethod] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoCheckedIn, setAutoCheckedIn] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // ---------------------------------------------------------------------------
  // If user already has a valid session, redirect to home immediately
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isSessionValid()) {
      navigate('/home', { replace: true })
    }
  }, [isSessionValid, navigate])

  // ---------------------------------------------------------------------------
  // Auto check-in when a templeId is present in the URL (QR scan flow)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!qrTempleId) return

    setSelectedMethod('qr')
    setLoading(true)
    setError(null)

    createSession(qrTempleId.trim().toLowerCase(), 'qr')
      .then(() => {
        setAutoCheckedIn(true)
        // Brief success flash before navigating
        setTimeout(() => navigate('/home', { replace: true }), 1200)
      })
      .catch((err) => {
        console.error('Auto check-in failed:', err)
        setError(err.message || 'Invalid QR code. Please try again or enter the temple code manually.')
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrTempleId])

  // ---------------------------------------------------------------------------
  // Manual continue button (QR without URL param, or manual code entry)
  // ---------------------------------------------------------------------------
  const handleContinue = async () => {
    setError(null)

    const templeId =
      selectedMethod === 'qr'
        ? 'temple_001' // default for demo when no QR URL param
        : manualCode.trim().toLowerCase()

    if (!templeId) return

    // Validate temple_### format for manual entry
    if (selectedMethod === 'code' && !/^temple_\d{3,}$/.test(templeId)) {
      setError('Invalid format. Temple code must be like: temple_001')
      return
    }

    setLoading(true)
    try {
      await createSession(templeId, selectedMethod)
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Check-in error:', err)
      setError(err.message || 'Invalid temple code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // QR scan success — extract templeId from scanned text and check in
  // ---------------------------------------------------------------------------
  const handleQRScanSuccess = useCallback(async (decodedText) => {
    setShowScanner(false)
    setError(null)
    setLoading(true)
    setSelectedMethod('qr')

    // Try to extract templeId from the scanned text
    // Supports: URL with ?templeId=xxx, or plain text temple ID
    let templeId = null

    try {
      const url = new URL(decodedText)
      templeId = url.searchParams.get('templeId')
    } catch {
      // Not a URL — treat the whole text as the temple ID
      templeId = decodedText.trim()
    }

    if (!templeId) {
      setError('Invalid QR code. No temple ID found. Please try again or enter the code manually.')
      setLoading(false)
      return
    }

    try {
      await createSession(templeId.trim().toLowerCase(), 'qr')
      setAutoCheckedIn(true)
      setTimeout(() => navigate('/home', { replace: true }), 1200)
    } catch (err) {
      console.error('QR check-in error:', err)
      setError(err.message || 'Check-in failed. Please try again or enter the temple code manually.')
      setLoading(false)
    }
  }, [createSession, navigate])

  // ---------------------------------------------------------------------------
  // Auto check-in success screen
  // ---------------------------------------------------------------------------
  if (autoCheckedIn) {
    return (
      <Layout show3D>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[#1E293B] mb-2">Welcome!</h2>
            <p className="text-[#475569]">Temple verified. Entering…</p>
          </motion.div>
        </div>
      </Layout>
    )
  }

  // ---------------------------------------------------------------------------
  // Auto check-in loading screen (waiting for backend)
  // ---------------------------------------------------------------------------
  if (qrTempleId && loading && !error) {
    return (
      <Layout show3D>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Loader2 className="w-12 h-12 animate-spin text-[#F59E0B] mx-auto mb-4" />
            <p className="text-[#475569] font-medium">Verifying temple presence…</p>
            <p className="text-sm text-gray-400 mt-1">{qrTempleId}</p>
          </motion.div>
        </div>
      </Layout>
    )
  }

  // ---------------------------------------------------------------------------
  // Main check-in UI (manual entry fallback or no QR param)
  // ---------------------------------------------------------------------------
  return (
    <Layout show3D>
      <div className="min-h-screen px-4 py-8 md:py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E293B] mb-2">FaithGuard</h1>
            <p className="text-lg text-[#475569] mb-4 font-medium">Temple Check-In</p>
            <p className="text-[#475569] text-base md:text-lg">
              Scan the temple QR code or enter your temple code to access the Lost & Found system.
            </p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-6 mb-8">
            {/* QR Code Option */}
            <motion.div variants={itemVariants}>
              <Card
                selected={selectedMethod === 'qr'}
                onClick={() => {
                  setSelectedMethod('qr')
                  setShowScanner(true)
                }}
                className="text-center relative overflow-hidden"
              >
                {selectedMethod === 'qr' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <CheckCircle2 className="w-6 h-6 text-[#F59E0B]" />
                  </motion.div>
                )}
                <div className="flex flex-col items-center space-y-5">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FDBA74]/20 to-[#F59E0B]/20 flex items-center justify-center shadow-lg"
                  >
                    <QrCode className="w-10 h-10 text-[#F59E0B]" strokeWidth={2} />
                  </motion.div>
                  <h2 className="text-2xl font-semibold text-[#1E293B]">Scan QR Code</h2>
                  <p className="text-[#475569] text-base max-w-sm">
                    Scan the QR displayed at the temple entrance. Your session will be created
                    automatically.
                  </p>
                  <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-center">
                    <Camera className="w-4 h-4 inline mr-1" />
                    Tap here to open your camera and scan the temple QR code.
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Divider */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-4 my-8"
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <span className="text-sm text-gray-400 font-semibold px-4">OR</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-transparent" />
            </motion.div>

            {/* Manual Code Option */}
            <motion.div variants={itemVariants}>
              <Card
                selected={selectedMethod === 'code'}
                onClick={() => setSelectedMethod('code')}
                className="text-center relative overflow-hidden"
              >
                {selectedMethod === 'code' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <CheckCircle2 className="w-6 h-6 text-[#F59E0B]" />
                  </motion.div>
                )}
                <div className="flex flex-col items-center space-y-5">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FDBA74]/20 to-[#F59E0B]/20 flex items-center justify-center shadow-lg"
                  >
                    <Key className="w-10 h-10 text-[#F59E0B]" strokeWidth={2} />
                  </motion.div>
                  <h2 className="text-2xl font-semibold text-[#1E293B]">Enter Temple Code</h2>
                  <p className="text-[#475569] text-base max-w-sm">
                    Manually enter the unique temple code shown at the entrance.
                  </p>
                  <Input
                    placeholder="e.g. temple_001"
                    value={manualCode}
                    onChange={(e) => {
                      setManualCode(e.target.value)
                      setSelectedMethod('code')
                    }}
                    className="max-w-xs text-center font-mono"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Continue Button */}
          <motion.div variants={itemVariants}>
            <Button
              size="lg"
              disabled={
                loading ||
                !selectedMethod ||
                (selectedMethod === 'code' && !manualCode.trim())
              }
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking in…
                </>
              ) : (
                <>
                  Enter Temple
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Trust Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-gray-400 mt-8"
          >
            No login • No tracking • Temporary access only • Session expires in 4 hours
          </motion.p>
        </motion.div>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <QRScanner
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>
    </Layout>
  )
}
