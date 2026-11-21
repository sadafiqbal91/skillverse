const express = require("express");
const { getLesson, completeLesson, updateLesson, draftLesson } = require("../controllers/lessonController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.post("/draft", authorize("instructor"), draftLesson); // ⚠️ "/:id" se pehle
router.get("/:id", getLesson);
router.patch("/:id", authorize("instructor"), updateLesson);
router.post("/:id/complete", authorize("student"), completeLesson);

module.exports = router;