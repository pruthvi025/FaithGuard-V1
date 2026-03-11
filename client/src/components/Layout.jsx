import Background3D from './Background3D'
import FloatingNotificationButton from './FloatingNotificationButton'
import { useSession } from '../context/SessionContext'
import { useLocation } from 'react-router-dom'

export default function Layout({ children, show3D = false }) {
  console.log('🎨 Layout rendering...', { show3D })
  const { session } = useSession()
  const location = useLocation()

  // Only show notification button on protected routes (after login)
  // Hide on landing page and check-in page
  const isPublicRoute = location.pathname === '/' || location.pathname === '/checkin'
  const shouldShowNotification = session && !isPublicRoute

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#FFF7ED' }}>
      {show3D && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <Background3D />
        </div>
      )}
      {/* Floating notification button - only shows after login on protected routes */}
      {shouldShowNotification && <FloatingNotificationButton />}
      <div className="relative" style={{ zIndex: 10, pointerEvents: 'auto' }}>
        {children}
      </div>
    </div>
  )
}