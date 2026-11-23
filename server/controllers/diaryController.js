// 📒 DIARY: bache ki roz ki diary (homework + tests), student aur parent dono ke liye
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Quiz = require("../models/Quiz");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Attempt = require("../models/Attempt");

const DAY = 24 * 60 * 60 * 1000;

const buildDiary = async (studentId, organizationId) => {
  const ens = await Enrollment.find({ studentId, organizationId }).populate("courseId", "title status");
  const courses = ens.map((e) => e.courseId).filter((c) => c && c.status === "published");
  const ids = courses.map((c) => c._id);
  const titleOf = Object.fromEntries(courses.map((c) => [String(c._id), c.title]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today.getTime() - 7 * DAY); // pichle hafte ka bacha hua kaam bhi
  const to = new Date(today.getTime() + 15 * DAY);

  const [assignments, subs, quizzes, attempts] = await Promise.all([
    Assignment.find({ courseId: { $in: ids }, dueDate: { $gte: from, $lte: to } }).select("title courseId dueDate maxMarks image"),
    Submission.find({ studentId }).select("assignmentId status"),
    Quiz.find({ courseId: { $in: ids }, kind: { $ne: "retest" }, testDate: { $gte: today, $lte: to } }).select("title courseId testDate kind timeLimitMinutes"),
    Attempt.find({ studentId, status: "submitted" }).select("quizId"),
  ]);
  const done = new Set(subs.map((s) => String(s.assignmentId)));
  const took = new Set(attempts.map((a) => String(a.quizId)));

  const items = [];
  for (const a of assignments) {
    const submitted = done.has(String(a._id));
    const overdue = !submitted && new Date(a.dueDate) < today;
    if (submitted && new Date(a.dueDate) < today) continue; // purana aur ho chuka
    items.push({
      _id: a._id, type: "homework", title: a.title, courseId: a.courseId, subject: titleOf[String(a.courseId)],
      date: a.dueDate, done: submitted, overdue, hasPicture: Boolean(a.image),
    });
  }
  for (const q of quizzes) {
    items.push({
      _id: q._id, type: q.kind === "revision" ? "revision" : "test", title: q.title, courseId: q.courseId,
      subject: titleOf[String(q.courseId)], date: q.testDate, done: took.has(String(q._id)), overdue: false,
      minutes: q.timeLimitMinutes,
    });
  }
  items.sort((x, y) => new Date(x.date) - new Date(y.date));
  return { items };
};

// GET /api/diary/me → student
const myDiary = async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Students only" });
    res.json(await buildDiary(req.user.userId, req.user.organizationId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/diary/child/:id → parent (sirf apna bacha 🔐)
const childDiary = async (req, res) => {
  try {
    if (req.user.role !== "parent") return res.status(403).json({ message: "Parents only" });
    const parent = await User.findOne({ _id: req.user.userId, organizationId: req.user.organizationId }).select("children");
    if (!parent || !parent.children.some((c) => String(c) === String(req.params.id))) {
      return res.status(403).json({ message: "This is not your child" });
    }
    res.json(await buildDiary(req.params.id, req.user.organizationId));
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { myDiary, childDiary };