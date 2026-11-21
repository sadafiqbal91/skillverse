const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const Organization = require("../models/Organization");
const { evaluateAttempt } = require("../services/interventionService");

const GRACE_MS = 30 * 1000;

// POST /api/attempts/:id/submit
const submitAttempt = async (req, res) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.id, organizationId: req.user.organizationId, studentId: req.user.userId,
    });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status === "submitted") return res.status(409).json({ message: "This attempt was already submitted" });

    const answerMap = new Map();
    for (const a of req.body.answers || []) answerMap.set(String(a.questionId), a.selectedIndex);

    const questions = await Question.find({ _id: { $in: attempt.questionIds } }).select("+correctIndex topic");

    const topics = {};
    let score = 0;
    attempt.answers = questions.map((q) => {
      const selected = answerMap.has(String(q._id)) ? answerMap.get(String(q._id)) : null;
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) score++;
      topics[q.topic] = topics[q.topic] || { correct: 0, total: 0 };
      topics[q.topic].total++;
      if (isCorrect) topics[q.topic].correct++;
      return { questionId: q._id, selectedIndex: selected, isCorrect };
    });

    const org = await Organization.findById(req.user.organizationId);
    attempt.score = score;
    attempt.total = questions.length;
    attempt.percent = Math.round((score / questions.length) * 100);
    attempt.passed = attempt.percent >= org.settings.passingMarks;
    attempt.topicScores = Object.entries(topics).map(([topic, t]) => ({
      topic, correct: t.correct, total: t.total, percent: Math.round((t.correct / t.total) * 100),
    }));
    attempt.isLate = Date.now() > attempt.expiresAt.getTime() + GRACE_MS;
    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    await attempt.save();

    const interventions = await evaluateAttempt(attempt, org.settings.passingMarks);

    res.json({
      message: "Quiz submitted ✅",
      kind: attempt.kind,
      score: attempt.score,
      total: attempt.total,
      percent: attempt.percent,
      passed: attempt.passed,
      passingMarks: org.settings.passingMarks,
      isLate: attempt.isLate,
      topicScores: attempt.topicScores,
      interventions,
    });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/attempts/me
const myAttempts = async (req, res) => {
  const attempts = await Attempt.find({
    organizationId: req.user.organizationId, studentId: req.user.userId, status: "submitted",
  })
    .populate("quizId", "title")
    .select("quizId kind score total percent passed topicScores submittedAt")
    .sort("-submittedAt");
  res.json({ count: attempts.length, attempts });
};

// GET /api/attempts/:id
const getAttempt = async (req, res) => {
  try {
    const filter = { _id: req.params.id, organizationId: req.user.organizationId };
    if (req.user.role === "student") filter.studentId = req.user.userId;
    const attempt = await Attempt.findOne(filter).populate("quizId", "title");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    res.json(attempt);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitAttempt, myAttempts, getAttempt };