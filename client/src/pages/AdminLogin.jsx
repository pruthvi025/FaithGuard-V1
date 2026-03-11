import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, AlertCircle, Loader2, Info } from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter both Admin ID and Password')
      return
    }

    setIsLoading(true)

    try {
      const result = await login(email.trim(), password)
      
      if (result.success) {
        // Navigate to admin dashboard
        navigate('/admin', { replace: true })
      } else {
        setError(result.error || 'Login failed. Please check your credentials.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout show3D={false}>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#FFF7ED]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FDBA74]/20 to-[#F59E0B]/20 mb-4">
                <Lock className="w-8 h-8 text-[#F59E0B]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1E293B] mb-2">
                Admin Login
              </h1>
              <p className="text-sm text-[#475569]">
                Enter your credentials to access the admin panel
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    Authentication Failed
                  </p>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#475569] mb-3">
                  Admin ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="admin@temple.org"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    className="pl-12"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#475569] mb-3">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    className="pl-12"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 inline animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login as Admin'
                )}
              </Button>
            </form>

            {/* Default Credentials Notice */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800 mb-1">
                  Test Credentials
                </p>
                <p className="text-xs text-blue-700">
                  Email: <strong>admin@temple.org</strong><br />
                  Password: <strong>admin123</strong>
                </p>
              </div>
            </motion.div>

            {/* Security Notice */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-center text-[#475569]">
                This is a test login system. For production, configure Firebase authentication.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </Layout>
  )
}
