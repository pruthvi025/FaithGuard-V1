// Firebase Configuration
// Replace these with your actual Firebase project credentials
// Get these from Firebase Console > Project Settings > General > Your apps

import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'your-app-id',
}

// Check if Firebase is properly configured
const isFirebaseConfigured = 
  firebaseConfig.apiKey !== 'your-api-key' &&
  firebaseConfig.projectId !== 'your-project-id' &&
  firebaseConfig.appId !== 'your-app-id' &&
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId

// Initialize Firebase only if not already initialized
let app = null
let auth = null
let db = null
let messaging = null

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    
    // Initialize Firebase Authentication and get a reference to the service
    auth = getAuth(app)
    
    // Initialize Cloud Firestore and get a reference to the service
    db = getFirestore(app)
    
    // Initialize Cloud Messaging (only in browser, not SSR)
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported) {
          try {
            messaging = getMessaging(app)
          } catch (error) {
            console.warn('Firebase Messaging initialization error:', error)
          }
        }
      })
    }
  } catch (error) {
    console.warn('Firebase initialization error:', error)
    console.warn('Admin features will not be available until Firebase is configured.')
    // Set to null so components can check
    app = null
    auth = null
    db = null
    messaging = null
  }
} else {
  console.info('Firebase not configured. Admin features disabled. See ADMIN_SETUP.md for setup instructions.')
}

export { auth, db, messaging, isFirebaseConfigured }
export default app
