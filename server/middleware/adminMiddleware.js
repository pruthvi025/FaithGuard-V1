// ============================================
// Admin Auth Middleware
// ============================================
// Verifies Firebase Auth ID token from the
// Authorization: Bearer <token> header.
// Checks for admin custom claim or whitelisted email.

const { admin } = require("../config/firebase");

// Whitelisted admin emails (you can extend this list)
const ADMIN_EMAILS = [
  "admin@temple.org",
  // Add more admin emails here
];

const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required",
    });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if user has admin custom claim OR is in whitelist
    if (decodedToken.admin || ADMIN_EMAILS.includes(decodedToken.email)) {
      req.adminUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        isAdmin: true,
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Not authorized as admin",
    });
  } catch (error) {
    console.error("❌ Admin auth error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token",
    });
  }
};

module.exports = { verifyAdmin };
