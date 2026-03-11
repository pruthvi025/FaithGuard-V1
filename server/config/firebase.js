// ============================================
// Firebase Admin Initialization
// ============================================
// Loads the service account key and initializes
// Firebase Admin SDK + Firestore.

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("✅ Firebase Admin SDK initialized successfully");

module.exports = { admin, db };
