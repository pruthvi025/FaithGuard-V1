// ============================================
// Session Routes
// ============================================
// POST /api/session/checkin  — create session
// GET  /api/session/verify   — verify session is valid
// POST /api/session/ping     — heartbeat

const express = require("express");
const { checkin, verify, ping } = require("../controllers/sessionController");

const router = express.Router();

router.post("/checkin", checkin);
router.get("/verify", verify);
router.post("/ping", ping);

module.exports = router;
