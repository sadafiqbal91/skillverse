const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const Organization = require("../models/Organization");
const { askJSON, AIError } = require("../services/aiService");

const handleError = (res, error) => {
  if (error instanceof AIError) return res.status(error.status || 502).json({ message: error.message });
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: error.message });
};

const cleanList = (arr) => (Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : []);
const cleanChecks = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((c) => ({ question: String(c?.question || "").trim(), answer: String(c?.answer || "").trim() }))
    .filter((c) => c.question);

// GET /api/lessons/:id
const getLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    let completed = false;
    if (req.user.role === "student") {
      const enrolled = await Enrollment.findOne({ courseId: lesson.courseId, studentId: req.user.userId });
      if (!enrolled) return res.status(403).json({ message: "Enroll in this course to open its lessons 🔒" });
      completed = enrolled.completedLessons.some((id) => id.equals(lesson._id));
    }
    if (req.user.role === "instructor") {
      const own = await Course.findOne({ _id: lesson.courseId, instructorId: req.user.userId });
      if (!own) return res.status(403).json({ message: "This is not your course" });
    }

    res.json({ ...lesson.toObject(), completed });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/lessons/:id/complete
const completeLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const enrollment = await Enrollment.findOne({ courseId: lesson.courseId, studentId: req.user.userId });
    if (!enrollment) return res.status(403).json({ message: "Enroll in this course first" });

    const wasCompleted = enrollment.status === "completed";
    if (!enrollment.completedLessons.some((id) => id.equals(lesson._id))) {
      enrollment.completedLessons.push(lesson._id);
    }

    const total = await Lesson.countDocuments({ courseId: lesson.courseId });
    enrollment.progressPercent = Math.round((enrollment.completedLessons.length / total) * 100);
    if (enrollment.progressPercent === 100 && !wasCompleted) {
      enrollment.status = "completed";
      enrollment.completedAt = new Date();
    }
    await enrollment.save();

    res.json({
      message: "Lesson completed ✅",
      progressPercent: enrollment.progressPercent,
      status: enrollment.status,
      courseCompleted: enrollment.status === "completed" && !wasCompleted,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/lessons/:id → ✏️ teacher edit
const updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const own = await Course.findOne({ _id: lesson.courseId, instructorId: req.user.userId });
    if (!own) return res.status(403).json({ message: "This is not your course" });

    const b = req.body || {};
    if (b.title !== undefined) {
      if (!String(b.title).trim()) return res.status(400).json({ message: "Lesson title is required" });
      lesson.title = String(b.title).trim();
    }
    if (b.content !== undefined) lesson.content = b.content;
    if (b.videoUrl !== undefined) lesson.videoUrl = b.videoUrl;
    if (b.durationMinutes !== undefined) lesson.durationMinutes = Number(b.durationMinutes) || 10;
    if (b.topics !== undefined) lesson.topics = cleanList(b.topics);
    if (b.keyPoints !== undefined) lesson.keyPoints = cleanList(b.keyPoints);
    if (b.example !== undefined) lesson.example = b.example;
    if (b.exampleCode !== undefined) lesson.exampleCode = b.exampleCode;
    if (b.checkYourself !== undefined) lesson.checkYourself = cleanChecks(b.checkYourself);

    await lesson.save();
    res.json({ message: "Lesson saved ✅", lesson });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/lessons/draft → ✨ AI draft (save nahi karta)
const draftLesson = async (req, res) => {
  try {
    const { courseId, title, topics = [] } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ message: "Write the lesson title first" });

    const [org, course] = await Promise.all([
      Organization.findById(req.user.organizationId).select("type"),
      courseId ? Course.findOne({ _id: courseId, organizationId: req.user.organizationId }).select("title") : null,
    ]);

    const audience =
      org?.type === "school"
        ? "a school child. Use very simple English, short sentences, and everyday examples from Pakistan (home, market, cricket, food)"
        : "a beginner at a computer institute. Be clear and practical, and use real working code where it helps";

    const prompt = `You are an expert, friendly teacher. Write a short lesson for ${audience}.
Course: ${course?.title || "General"}
Lesson title: ${title}
Topics: ${cleanList(topics).join(", ") || title}

Return ONLY valid JSON in exactly this shape:
{
  "content": "3 to 5 short paragraphs that explain the idea step by step",
  "keyPoints": ["4 short points to remember"],
  "example": "one real-life example in 1 to 3 sentences",
  "exampleCode": "a short code example ONLY if this is a programming or computer lesson, otherwise an empty string",
  "checkYourself": [{ "question": "a short question", "answer": "the short correct answer" }]
}
Give exactly 3 items in checkYourself.`;

    const ai = await askJSON([{ text: prompt }]);
    const draft = {
      content: String(ai.content || "").trim(),
      keyPoints: cleanList(ai.keyPoints).slice(0, 6),
      example: String(ai.example || "").trim(),
      exampleCode: String(ai.exampleCode || "").trim(),
      checkYourself: cleanChecks(ai.checkYourself).slice(0, 5),
    };
    if (!draft.content) return res.status(502).json({ message: "AI could not write this lesson. Please try again." });

    res.json({ message: "Draft ready ✨ Please check it before saving.", draft });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getLesson, completeLesson, updateLesson, draftLesson };