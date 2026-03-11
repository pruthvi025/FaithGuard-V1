import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { NotificationCenterProvider } from './context/NotificationCenterContext'
import ProtectedRoute from './components/ProtectedRoute'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import LandingPage from './pages/LandingPage'
import CheckInPage from './pages/CheckInPage'
import HomePage from './pages/HomePage'
import LostItemsFeed from './pages/LostItemsFeed'
import ReportLostItem from './pages/ReportLostItem'
import ItemDetail from './pages/ItemDetail'
import CaseClosed from './pages/CaseClosed'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'

function App() {
  console.log('📱 App component rendering...')
  
  // Safety check
  try {
    return (
      <Router>
        <SessionProvider>
          <NotificationProvider>
            <NotificationCenterProvider>
              <AdminAuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            
            {/* User Routes (Protected by Session) */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedRoute>
                  <LostItemsFeed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportLostItem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/item/:id"
              element={
                <ProtectedRoute>
                  <ItemDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/closed" element={<CaseClosed />} />
            
            {/* Admin Routes (Protected by Admin Auth) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
          </Routes>
              </AdminAuthProvider>
            </NotificationCenterProvider>
          </NotificationProvider>
        </SessionProvider>
      </Router>
    )
  } catch (error) {
    console.error('❌ App render error:', error)
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>App Error</h1>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    )
  }
}

export default App