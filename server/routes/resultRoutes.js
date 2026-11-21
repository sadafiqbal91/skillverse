const express = require("express");
const { courseResults, remindQuiz, studentTimeline } = require("../controllers/resultController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.get("/course/:courseId", authorize("instructor", "orgadmin"), courseResults);
router.post("/quiz/:quizId/remind", authorize("instructor"), remindQuiz);
router.get("/student/:studentId", authorize("instructor", "orgadmin"), studentTimeline);

module.exports = router;