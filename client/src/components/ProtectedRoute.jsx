import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

export default function ProtectedRoute({ children }) {
  const { isSessionValid } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSessionValid()) {
      // Session invalid or expired, redirect to check-in
      navigate('/checkin', { replace: true })
    }
  }, [isSessionValid, navigate])

  // Don't render children if session is invalid
  if (!isSessionValid()) {
    return null
  }

  return children
}
