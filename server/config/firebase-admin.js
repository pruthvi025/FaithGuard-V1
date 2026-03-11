// Firebase Admin SDK Configuration
// This will be used for server-side Firestore operations and authentication
//
// To set up:
// 1. Go to Firebase Console > Project Settings > Service Accounts
// 2. Click "Generate new private key"
// 3. Save the JSON file and set the path in .env as FIREBASE_SERVICE_ACCOUNT_PATH
//    OR paste the JSON content as FIREBASE_SERVICE_ACCOUNT_JSON

import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

let db = null
let auth = null
let isInitialized = false

try {
  // Option 1: Service account JSON file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = JSON.parse(
      await import('fs').then(fs =>
        fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
      )
    )
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    isInitialized = true
  }
  // Option 2: Service account JSON as env variable (for Render deployment)
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    isInitialized = true
  }
  // Not configured
  else {
    console.warn('⚠️  Firebase Admin SDK not configured. See .env.example for setup.')
  }

  if (isInitialized) {
    db = admin.firestore()
    auth = admin.auth()
    console.log('✅ Firebase Admin SDK initialized successfully')
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message)
}

export { db, auth, isInitialized }
export default admin
