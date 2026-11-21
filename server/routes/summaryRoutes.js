const express = require("express");
const Organization = require("../models/Organization");
const { buildDailySummary, sendDailySummary } = require("../services/summaryService");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// ⏰ Vercel roz shaam 5 baje
router.get("/cron", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Not allowed" });
  }
  try {
    const orgs = await Organization.find({ isActive: true }).select("_id");
    let sent = 0;
    for (const o of orgs) {
      const r = await sendDailySummary(o._id, { which: "today" });
      if (r.sent) sent += 1;
    }
    res.json({ message: `Daily summary sent to ${sent} institute(s)` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use(protect, authorize("orgadmin"));

router.get("/today", async (req, res) => {
  try {
    res.json(await buildDailySummary(req.user.organizationId, "today"));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ☀️ Principal ne app kholi: kal ka khulasa (din mein 1 baar)
router.post("/auto", async (req, res) => {
  try {
    const r = await sendDailySummary(req.user.organizationId, { which: "yesterday" });
    res.json({ sent: r.sent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/send", async (req, res) => {
  try {
    const r = await sendDailySummary(req.user.organizationId, { force: true, which: "today" });
    res.json({ message: r.sent ? "Summary sent to your 🔔 bell ✅" : `Not sent: ${r.reason}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;