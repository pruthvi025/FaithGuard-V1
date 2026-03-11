// ============================================
// Firebase Admin Initialization
// ============================================
// Supports both local development (serviceAccountKey.json file)
// and production deployment (FIREBASE_SERVICE_ACCOUNT_JSON env var).

const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Production (Render): read from environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  // Local dev: read from file
  serviceAccount = require("../serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("✅ Firebase Admin SDK initialized successfully");

module.exports = { admin, db };
