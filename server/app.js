// ============================================
// Express App Setup
// ============================================
// Creates the Express app, enables middlewares,
// and mounts all routes.

const express = require("express");
const cors = require("cors");

const testRoutes = require("./routes/testRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const itemRoutes = require("./routes/itemRoutes");
const messageRoutes = require("./routes/messageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const claimRoutes = require("./routes/claimRoutes");
const foundItemRoutes = require("./routes/foundItemRoutes");
const foundClaimRoutes = require("./routes/foundClaimRoutes");

const app = express();

// ---- Middlewares ----
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" })); // 10mb for base64 images

// ---- Routes ----
app.use("/api", testRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/found-items", foundItemRoutes);
app.use("/api/found-claims", foundClaimRoutes);

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
