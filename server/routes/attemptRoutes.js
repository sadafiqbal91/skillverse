const express = require("express");
const { submitAttempt, myAttempts, getAttempt } = require("../controllers/attemptController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/me", authorize("student"), myAttempts); // ⚠️ "/:id" se PEHLE
router.get("/:id", getAttempt);
router.post("/:id/submit", authorize("student"), submitAttempt);

module.exports = router;