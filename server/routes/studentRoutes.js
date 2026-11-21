const express = require("express");
const { myProgress } = require("../controllers/progressController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/me/progress", authorize("student"), myProgress);

module.exports = router;