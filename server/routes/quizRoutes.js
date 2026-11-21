const express = require("express");
const {
  createQuiz, updateQuiz, deleteQuiz, addQuestions, generateQuestions, getQuizQuestions,
  updateQuestion, deleteQuestion, listQuizzes, upcomingTests, startAttempt,
} = require("../controllers/quizController");
const { revisionPlan, createRevision } = require("../controllers/revisionController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

router.post("/", authorize("instructor"), createQuiz);
router.get("/", listQuizzes);
router.get("/upcoming", authorize("student"), upcomingTests);
// 📝 Revision test ⚠️ "/:id" se PEHLE
router.get("/revision/plan/:courseId", authorize("instructor"), revisionPlan);
router.post("/revision/:courseId", authorize("instructor"), createRevision);
router.patch("/questions/:qid", authorize("instructor"), updateQuestion);
router.delete("/questions/:qid", authorize("instructor"), deleteQuestion);
router.get("/:id/questions", authorize("instructor"), getQuizQuestions);
router.post("/:id/questions", authorize("instructor"), addQuestions);
router.post("/:id/generate", authorize("instructor"), generateQuestions);
router.post("/:id/attempts", authorize("student"), startAttempt);
router.patch("/:id", authorize("instructor"), updateQuiz);
router.delete("/:id", authorize("instructor"), deleteQuiz);

module.exports = router;