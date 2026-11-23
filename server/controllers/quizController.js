const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const Enrollment = require("../models/Enrollment");
const Lesson = require("../models/Lesson");
const Organization = require("../models/Organization");
const { notify, parentsOf } = require("../services/interventionService");
const { askJSON, AIError } = require("../services/aiService");
const { alertClassTeacher } = require("../services/classAlertService");

const DAY = 24 * 60 * 60 * 1000;

const handleError = (res, error) => {
  if (error instanceof AIError) return res.status(error.status).json({ message: error.message });
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: error.message });
};

const findOwnQuiz = async (quizId, req) => {
  const quiz = await Quiz.findOne({ _id: quizId, organizationId: req.user.organizationId });
  if (!quiz) return null;
  const own = await Course.findOne({ _id: quiz.courseId, instructorId: req.user.userId });
  return own ? quiz : null;
};

// 📅 Tell every enrolled student + their parents about the test date
const announceTest = async (quiz, course, organizationId) => {
  const ens = await Enrollment.find({ courseId: course._id }).select("studentId");
  const studentIds = ens.map((e) => e.studentId);
  if (!studentIds.length) return;
  const parentIds = (await Promise.all(studentIds.map((id) => parentsOf(id)))).flat();
  const when = new Date(quiz.testDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  await notify(organizationId, [...studentIds, ...parentIds], {
    type: "test_scheduled",
    title: `📅 ${course.title}: test on ${when}`,
    message: `"${quiz.title}" is on ${when}. Practise your weak topics before the test.`,
    meta: { courseId: course._id, quizId: quiz._id },
  });
};

// POST /api/quizzes → instructor
const createQuiz = async (req, res) => {
  try {
    const { courseId, title, timeLimitMinutes, questionsPerAttempt, kind, testDate } = req.body;
    if (!courseId || !title) return res.status(400).json({ message: "Course and title are required" });

    const course = await Course.findOne({ _id: courseId, organizationId: req.user.organizationId, instructorId: req.user.userId });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const quiz = await Quiz.create({
      organizationId: req.user.organizationId, courseId, title, timeLimitMinutes, questionsPerAttempt, kind,
      testDate: testDate || undefined,
    });
    if (quiz.testDate) await announceTest(quiz, course, req.user.organizationId);
    const when = quiz.testDate ? " (test on " + new Date(quiz.testDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ")" : "";
    await alertClassTeacher(req.user.organizationId, course._id, req.user.userId, "made a quiz: " + title + when);

    res.status(201).json({ message: "Quiz created ✅", quiz });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/quizzes/:id → instructor (settings + test date)
const updateQuiz = async (req, res) => {
  try {
    const quiz = await findOwnQuiz(req.params.id, req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const { title, timeLimitMinutes, questionsPerAttempt, testDate } = req.body;
    const oldDate = quiz.testDate ? quiz.testDate.toISOString().slice(0, 10) : null;
    if (title) quiz.title = title;
    if (timeLimitMinutes) quiz.timeLimitMinutes = timeLimitMinutes;
    if (questionsPerAttempt) quiz.questionsPerAttempt = questionsPerAttempt;
    if (testDate !== undefined) quiz.testDate = testDate || undefined;
    await quiz.save();

    const newDate = quiz.testDate ? quiz.testDate.toISOString().slice(0, 10) : null;
    let announced = false;
    if (newDate && newDate !== oldDate) {
      const course = await Course.findById(quiz.courseId).select("title");
      await announceTest(quiz, course, req.user.organizationId);
      announced = true;
    }
    res.json({ message: announced ? "Saved ✅ Students and parents were notified 📅" : "Saved ✅", quiz });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE /api/quizzes/:id → instructor (only if nobody has taken it)
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await findOwnQuiz(req.params.id, req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    const attempts = await Attempt.countDocuments({ quizId: quiz._id });
    if (attempts) return res.status(400).json({ message: "Students have already taken this quiz, so it can't be deleted. You can still edit it." });
    await Question.deleteMany({ quizId: quiz._id });
    await quiz.deleteOne();
    res.json({ message: "Quiz deleted 🗑️", courseId: quiz.courseId });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/quizzes/:id/questions → instructor (one or many)
const addQuestions = async (req, res) => {
  try {
    const quiz = await findOwnQuiz(req.params.id, req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Please send at least one question" });
    }
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length < 2 || !q.topic ||
          typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        return res.status(400).json({ message: `Please check this question: "${q.text || "?"}"` });
      }
    }

    await Question.insertMany(questions.map((q) => ({
      organizationId: req.user.organizationId, quizId: quiz._id,
      text: q.text, options: q.options, correctIndex: q.correctIndex, topic: q.topic, important: Boolean(q.important),
    })));

    const course = await Course.findById(quiz.courseId);
    const newTopics = [...new Set(questions.map((q) => q.topic))].filter((t) => !course.topics.includes(t));
    if (newTopics.length) {
      course.topics.push(...newTopics);
      await course.save();
    }

    const count = await Question.countDocuments({ quizId: quiz._id });
    res.status(201).json({ message: `${questions.length} question(s) added ✅`, totalInBank: count });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/quizzes/:id/generate → instructor: ✨ AI drafts (NOT saved until the teacher approves)
const generateQuestions = async (req, res) => {
  try {
    const quiz = await findOwnQuiz(req.params.id, req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const { source = "topic", lessonId, level = "medium", useVideo = true } = req.body;
    const count = Math.min(Math.max(Number(req.body.count) || 5, 1), 10);
    let topicName = (req.body.topic || "").trim();
    let material = "";
    let videoUrl = null;

    if (source === "lesson") {
      const lesson = await Lesson.findOne({ _id: lessonId, courseId: quiz.courseId });
      if (!lesson) return res.status(404).json({ message: "Lesson not found" });
      topicName = topicName || lesson.topics?.[0] || lesson.title;
      if (lesson.content) material = `Lesson title: ${lesson.title}\nLesson content:\n${lesson.content.slice(0, 8000)}`;
      if (useVideo && /youtu\.?be/.test(lesson.videoUrl || "")) videoUrl = lesson.videoUrl;
      if (!material && !videoUrl) {
        return res.status(400).json({ message: "This lesson has no content or YouTube video for the AI to read. Add the lesson's main points first." });
      }
    }
    if (!topicName) return res.status(400).json({ message: "Please enter a topic" });

    const org = await Organization.findById(req.user.organizationId).select("type");
    const audience = org?.type === "school"
      ? "school children (use simple words and short sentences)"
      : "students at a computer institute or college";

    const prompt = `You are helping a teacher write a quiz for ${audience}.
Write exactly ${count} multiple-choice questions about "${topicName}" at ${level} difficulty.
${material || videoUrl ? `Use ONLY what is taught in the ${material ? "lesson material below" : ""}${material && videoUrl ? " and the " : ""}${videoUrl ? "attached video" : ""}. Do not ask about anything that is not covered.` : ""}
Rules: exactly 4 short options per question, exactly one correct answer, vary the position of the correct answer, no "all of the above", clear English.
Return ONLY a JSON array like:
[{"text":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"one short sentence"}]
${material ? `\n${material}` : ""}`;

    let raw = null;
    let usedVideo = false;
    if (videoUrl) {
      try {
        raw = await askJSON([{ fileData: { fileUri: videoUrl } }, { text: prompt }]);
        usedVideo = true;
      } catch (e) {
        if (e.status === 429) throw e;
        if (!material) throw new AIError("AI could not read this video. Please add the lesson's main points in its content.", 400);
      }
    }
    if (!raw) raw = await askJSON([{ text: prompt }]);

    const list = Array.isArray(raw) ? raw : raw?.questions || [];
    const questions = list
      .filter((q) => q && q.text && Array.isArray(q.options) && q.options.length >= 4 &&
        Number.isInteger(Number(q.correctIndex)) && Number(q.correctIndex) >= 0 && Number(q.correctIndex) <= 3)
      .slice(0, count)
      .map((q) => ({
        text: String(q.text).trim(),
        options: q.options.slice(0, 4).map((o) => String(o).trim()),
        correctIndex: Number(q.correctIndex),
        topic: topicName,
        explanation: q.explanation ? String(q.explanation) : "",
      }));
    if (!questions.length) return res.status(502).json({ message: "AI could not make questions this time. Please try again." });

    res.json({ message: `✨ ${questions.length} draft question(s) ready. Check them, then add.`, questions, usedVideo });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/quizzes/:id/questions → instructor: full bank WITH answers (+ lessons for AI)
const getQuizQuestions = async (req, res) => {
  try {
    const quiz = await findOwnQuiz(req.params.id, req);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    const [course, questions, lessons] = await Promise.all([
      Course.findById(quiz.courseId).select("title topics"),
      Question.find({ quizId: quiz._id }).select("+correctIndex").sort("createdAt"),
      Lesson.find({ courseId: quiz.courseId }).select("title topics videoUrl").sort("order"),
    ]);
    res.json({ quiz, course, questions, lessons });
  } catch (error) {
    handleError(res, error);
  }
};

const findOwnQuestion = async (req) => {
  const q = await Question.findOne({ _id: req.params.qid, organizationId: req.user.organizationId });
  if (!q) return null;
  return (await findOwnQuiz(q.quizId, req)) ? q : null;
};

// PATCH /api/quizzes/questions/:qid → instructor (⭐ important)
const updateQuestion = async (req, res) => {
  try {
    const q = await findOwnQuestion(req);
    if (!q) return res.status(404).json({ message: "Question not found" });
    if (typeof req.body.important === "boolean") q.important = req.body.important;
    await q.save();
    res.json({ message: q.important ? "Marked as important ⭐" : "Removed from important", question: q });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE /api/quizzes/questions/:qid → instructor
const deleteQuestion = async (req, res) => {
  try {
    const q = await findOwnQuestion(req);
    if (!q) return res.status(404).json({ message: "Question not found" });
    await q.deleteOne();
    res.json({ message: "Question deleted 🗑️" });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/quizzes?courseId=... → everyone
const listQuizzes = async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.courseId) filter.courseId = req.query.courseId;
    const quizzes = await Quiz.find(filter).select("title courseId timeLimitMinutes questionsPerAttempt kind testDate");
    res.json({ count: quizzes.length, quizzes });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/quizzes/upcoming → student: tests with a date, in my courses
const upcomingTests = async (req, res) => {
  try {
    const ens = await Enrollment.find({ studentId: req.user.userId }).select("courseId");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const quizzes = await Quiz.find({ courseId: { $in: ens.map((e) => e.courseId) }, testDate: { $gte: today } })
      .populate("courseId", "title")
      .select("title courseId testDate timeLimitMinutes")
      .sort("testDate");
    res.json({
      tests: quizzes.map((q) => ({ ...q.toObject(), daysLeft: Math.max(Math.round((new Date(q.testDate) - today) / DAY), 0) })),
    });
  } catch (error) {
    handleError(res, error);
  }
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// POST /api/quizzes/:id/attempts → student: start a quiz
const startAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const enrolled = await Enrollment.findOne({ courseId: quiz.courseId, studentId: req.user.userId });
    if (!enrolled) return res.status(403).json({ message: "Please enroll in this course first 🎟️" });

    let attempt = await Attempt.findOne({
      quizId: quiz._id, studentId: req.user.userId, status: "in_progress", expiresAt: { $gt: new Date() },
    });

    if (!attempt) {
      const bank = await Question.find({ quizId: quiz._id }).select("_id");
      if (bank.length === 0) return res.status(400).json({ message: "This quiz has no questions yet" });

      const picked = shuffle(bank).slice(0, quiz.questionsPerAttempt);
      attempt = await Attempt.create({
        organizationId: req.user.organizationId, quizId: quiz._id, courseId: quiz.courseId, studentId: req.user.userId,
        questionIds: picked.map((q) => q._id), total: picked.length,
        expiresAt: new Date(Date.now() + quiz.timeLimitMinutes * 60 * 1000),
      });
    }

    const questions = await Question.find({ _id: { $in: attempt.questionIds } }).select("text options topic");
    res.status(201).json({ attemptId: attempt._id, title: quiz.title, expiresAt: attempt.expiresAt, questions: shuffle(questions) });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createQuiz, updateQuiz, deleteQuiz, addQuestions, generateQuestions, getQuizQuestions,
  updateQuestion, deleteQuestion, listQuizzes, upcomingTests, startAttempt,
};