const express = require("express");
const { myNotifications, markRead, markAllRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/me", myNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;