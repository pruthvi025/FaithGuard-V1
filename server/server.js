// ============================================
// Server Entry Point
// ============================================
// Starts the Express server and cleanup scheduler.

require("dotenv").config();

const app = require("./app");
const { startCleanupScheduler } = require("./services/cleanupScheduler");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🛕 FaithGuard API running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/test-firebase`);

  // Start auto-cleanup of expired sessions & tokens
  startCleanupScheduler();
});
