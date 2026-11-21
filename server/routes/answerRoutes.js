const express = require("express");
const Attempt = require("../models/Attempt");
const Course = require("../models/Course");
const User = require("../models/User");
const { buildAnswers } = require("../services/answerService");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);

// 👁️ GET /api/answers/attempt/:id
router.get("/attempt/:id", async (req, res) => {
  try {
    const attempt = await Attempt.findOne({ _id: req.params.id, organizationId: req.user.organizationId })
      .populate("quizId", "title courseId");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status && attempt.status !== "submitted") {
      return res.status(400).json({ message: "Answers are shown after the quiz is submitted" });
    }

    const { role, userId } = req.user;
    let allowed = false;
    if (role === "student") allowed = String(attempt.studentId) === String(userId);
    if (role === "orgadmin") allowed = true;
    if (role === "instructor") {
      const courseId = attempt.courseId || attempt.quizId?.courseId;
      allowed = !!(courseId && (await Course.exists({ _id: courseId, instructorId: userId })));
    }
    if (role === "parent") {
      const parent = await User.findById(userId).select("children");
      allowed = !!parent?.children.some((c) => String(c) === String(attempt.studentId));
    }
    if (!allowed) return res.status(403).json({ message: "You can't see these answers" });

    res.json(await buildAnswers(attempt));
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;