import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, AlertCircle, QrCode } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import Layout from '../components/Layout'

/**
 * /enter?templeId=temple_001
 *
 * This page is opened when the user scans a QR code at the temple entrance.
 * It automatically creates a session and redirects to /home.
 * No manual login UI is shown — purely automatic flow.
 */
export default function TempleEntry() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { createSession, isSessionValid } = useSession()

  const templeId = searchParams.get('templeId')

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // ── Already have a valid session? Go straight to home ──
    if (isSessionValid()) {
      navigate('/home', { replace: true })
      return
    }

    // ── No templeId in URL → invalid QR ──
    if (!templeId) {
      setStatus('error')
      setErrorMessage('Invalid temple QR code.')
      return
    }

    // ── Normalise & auto-check-in ──
    const normalizedTempleId = templeId.trim().toLowerCase()

    let cancelled = false

    createSession(normalizedTempleId, 'qr')
      .then(() => {
        if (cancelled) return
        setStatus('success')
        // Brief success animation before redirect
        setTimeout(() => navigate('/home', { replace: true }), 1200)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('QR auto check-in failed:', err)
        setStatus('error')
        setErrorMessage(
          err.message || 'Failed to create session. Please try again.'
        )
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId])

  // ─── Success Screen ───────────────────────────────────────────────
  if (status === 'success') {
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
            <h2 className="text-2xl font-bold text-[#1E293B] mb-2">
              Welcome!
            </h2>
            <p className="text-[#475569]">Temple verified. Entering…</p>
          </motion.div>
        </div>
      </Layout>
    )
  }

  // ─── Error Screen ─────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <Layout show3D>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6"
            >
              <AlertCircle className="w-12 h-12 text-red-500" />
            </motion.div>

            <h2 className="text-2xl font-bold text-[#1E293B] mb-2">
              Entry Failed
            </h2>
            <p className="text-[#475569] mb-6">{errorMessage}</p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/checkin', { replace: true })}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#FDBA74] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Enter Temple Code Manually
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full px-6 py-3 rounded-xl border border-gray-200 text-[#475569] font-medium hover:bg-gray-50 transition-all"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        </div>
      </Layout>
    )
  }

  // ─── Loading Screen (default) ─────────────────────────────────────
  return (
    <Layout show3D>
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FDBA74]/20 to-[#F59E0B]/20 flex items-center justify-center mx-auto mb-6"
          >
            <QrCode className="w-10 h-10 text-[#F59E0B]" />
          </motion.div>

          <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B] mx-auto mb-4" />
          <p className="text-[#475569] font-medium text-lg">
            Verifying temple presence…
          </p>
          {templeId && (
            <p className="text-sm text-gray-400 mt-2 font-mono">{templeId}</p>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}
