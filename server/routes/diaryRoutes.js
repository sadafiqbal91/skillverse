const express = require("express");
const { myDiary, childDiary } = require("../controllers/diaryController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/me", myDiary); // 📒 student
router.get("/child/:id", childDiary); // 📒 parent

module.exports = router;