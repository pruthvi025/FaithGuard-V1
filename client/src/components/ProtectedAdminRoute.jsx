import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedAdminRoute({ children }) {
  const { isAdmin, loading } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAdmin) {
      // Not an admin, redirect to login
      navigate('/admin/login', { replace: true })
    }
  }, [isAdmin, loading, navigate])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#475569]">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not admin
  if (!isAdmin) {
    return null
  }

  return children
}
