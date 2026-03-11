import { createContext, useContext, useState, useEffect } from 'react'

const AdminAuthContext = createContext(null)

// Default admin credentials for testing (in production, use Firebase)
const DEFAULT_ADMIN_EMAIL = 'admin@temple.org'
const DEFAULT_ADMIN_PASSWORD = 'admin123'
const ADMIN_SESSION_KEY = 'faithguard_admin_session'
const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 hours

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Load admin session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(ADMIN_SESSION_KEY)
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession)
        // Check if session is still valid (not expired)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          setAdminUser({ email: session.email })
          setIsAdmin(true)
        } else {
          // Session expired, clear it
          localStorage.removeItem(ADMIN_SESSION_KEY)
        }
      } catch (e) {
        localStorage.removeItem(ADMIN_SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Simple local authentication (for testing only)
    // In production, replace with Firebase authentication
    
    // Validate credentials
    if (email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() && 
        password === DEFAULT_ADMIN_PASSWORD) {
      // Create session
      const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION)
      const session = {
        email: email.trim().toLowerCase(),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      }
      
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
      setAdminUser({ email: email.trim().toLowerCase() })
      setIsAdmin(true)
      
      return { success: true, user: { email: email.trim().toLowerCase() } }
    } else {
      return { 
        success: false, 
        error: 'Invalid credentials. Use: admin@temple.org / admin123' 
      }
    }
  }

  const logout = async () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    setAdminUser(null)
    setIsAdmin(false)
    return { success: true }
  }

  const value = {
    adminUser,
    isAdmin,
    loading,
    login,
    logout,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
