const Enrollment = require("../models/Enrollment");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const Intervention = require("../models/Intervention");
const { buildTermScores } = require("../services/termScoreService");

const levelOf = (p) => (p >= 70 ? "strong" : p >= 50 ? "average" : "weak");

const buildProgress = async (studentId, organizationId) => {
  const enrollments = await Enrollment.find({ studentId, organizationId }).populate("courseId", "title topics");
  const attempts = await Attempt.find({ studentId, organizationId, status: "submitted", kind: "regular" })
    .populate("quizId", "title")
    .sort("-submittedAt");

  // Tested topics
  const topicMap = {};
  for (const at of attempts) {
    for (const t of at.topicScores) {
      topicMap[t.topic] = topicMap[t.topic] || { correct: 0, total: 0 };
      topicMap[t.topic].correct += t.correct;
      topicMap[t.topic].total += t.total;
    }
  }
  const topics = Object.entries(topicMap)
    .map(([topic, t]) => {
      const percent = Math.round((t.correct / t.total) * 100);
      return { topic, correct: t.correct, total: t.total, percent, level: levelOf(percent) };
    })
    .sort((a, b) => a.percent - b.percent);

  // Recovered after a successful re-test
  const ivs = await Intervention.find({ studentId, organizationId }).sort("-updatedAt");
  const latest = {};
  for (const iv of ivs) if (!latest[iv.topic]) latest[iv.topic] = iv;
  for (const t of topics) {
    const iv = latest[t.topic];
    if (iv && iv.level === "resolved" && t.level === "weak") {
      t.level = "recovered";
      t.retestPercent = iv.latestPercent;
    }
  }

  // ⚪ Course topics not tested yet
  const seen = new Set(topics.map((t) => t.topic));
  for (const e of enrollments) {
    for (const topic of e.courseId?.topics || []) {
      if (!seen.has(topic)) {
        topics.push({ topic, correct: 0, total: 0, percent: null, level: "not_started" });
        seen.add(topic);
      }
    }
  }

  // 📓 Mistake notebook
  const wrong = [];
  for (const at of attempts) {
    for (const a of at.answers) {
      if (!a.isCorrect) wrong.push({ questionId: a.questionId, selectedIndex: a.selectedIndex, quiz: at.quizId?.title });
    }
  }
  const recent = wrong.slice(0, 10);
  const qs = await Question.find({ _id: { $in: recent.map((w) => w.questionId) } }).select("+correctIndex text options topic");
  const qMap = new Map(qs.map((q) => [String(q._id), q]));
  const mistakeNotebook = recent
    .map((w) => {
      const q = qMap.get(String(w.questionId));
      if (!q) return null;
      return {
        question: q.text,
        topic: q.topic,
        yourAnswer: w.selectedIndex !== null && w.selectedIndex !== undefined ? q.options[w.selectedIndex] : "Left blank",
        correctAnswer: q.options[q.correctIndex],
        quiz: w.quiz,
      };
    })
    .filter(Boolean);

  const averageQuizPercent = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.percent, 0) / attempts.length)
    : 0;

  // 📊 Term marks (25) har subject ke
  const courseIds = enrollments.map((e) => e.courseId?._id).filter(Boolean);
  const term = await buildTermScores([studentId], courseIds);
  const termScores = enrollments.filter((e) => e.courseId).map((e) => ({
    courseId: e.courseId._id,
    title: e.courseId.title,
    ...term(studentId, e.courseId._id),
  }));

  return {
    summary: {
      coursesEnrolled: enrollments.length,
      coursesCompleted: enrollments.filter((e) => e.status === "completed").length,
      quizzesTaken: attempts.length,
      averageQuizPercent,
    },
    courses: enrollments.map((e) => ({
      courseId: e.courseId?._id,
      title: e.courseId?.title,
      progressPercent: e.progressPercent,
      status: e.status,
    })),
    topics,
    weakTopics: topics.filter((t) => t.level === "weak").map((t) => t.topic),
    recentAttempts: attempts.slice(0, 10).map((a) => ({
      quiz: a.quizId?.title, percent: a.percent, passed: a.passed, submittedAt: a.submittedAt,
    })),
    mistakeNotebook,
    termScores,
  };
};

const myProgress = async (req, res) => {
  try {
    res.json(await buildProgress(req.user.userId, req.user.organizationId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { myProgress, buildProgress };