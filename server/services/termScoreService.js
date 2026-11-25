// 📊 Term marks (25): 🧠 quizzes 15 + 📝 homework 10
// Sirf asal quiz ki PEHLI koshish ginti hoti hai. Re-test aur revision practice hain, marks nahi.
// Final exam (75) alag hai: wo V3 mein report card ke saath aayega.
const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");

const QUIZ_MAX = 15;
const HW_MAX = 10;
const r1 = (n) => Math.round(n * 10) / 10;
const avg = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null);

// studentIds × courseIds → get(studentId, courseId)
const buildTermScores = async (studentIds, courseIds) => {
  const sIds = studentIds.map(String);
  const cIds = courseIds.filter(Boolean);
  const [quizzes, attempts, assignments] = await Promise.all([
    Quiz.find({ courseId: { $in: cIds }, kind: { $nin: ["retest", "revision"] } }).select("_id"),
    Attempt.find({ studentId: { $in: sIds }, courseId: { $in: cIds }, status: "submitted", kind: "regular" })
      .select("studentId courseId quizId percent submittedAt").sort("submittedAt"),
    Assignment.find({ courseId: { $in: cIds } }).select("_id courseId maxMarks"),
  ]);
  const subs = await Submission.find({ studentId: { $in: sIds }, assignmentId: { $in: assignments.map((a) => a._id) }, status: "graded" })
    .select("studentId assignmentId marks");

  const okQuiz = new Set(quizzes.map((q) => String(q._id)));
  const asg = new Map(assignments.map((a) => [String(a._id), a]));
  const box = {};
  const at = (s, c) => (box[s + ":" + c] = box[s + ":" + c] || { quiz: [], hw: [], seen: new Set() });

  for (const a of attempts) {
    const q = String(a.quizId);
    if (!a.quizId || !okQuiz.has(q)) continue;
    const b = at(String(a.studentId), String(a.courseId));
    if (b.seen.has(q)) continue; // sirf pehli koshish
    b.seen.add(q);
    b.quiz.push(a.percent);
  }
  for (const s of subs) {
    const a = asg.get(String(s.assignmentId));
    if (!a || s.marks == null || !a.maxMarks) continue;
    at(String(s.studentId), String(a.courseId)).hw.push(Math.min(100, (s.marks / a.maxMarks) * 100));
  }

  return (studentId, courseId) => {
    const b = box[String(studentId) + ":" + String(courseId)] || { quiz: [], hw: [] };
    const qp = avg(b.quiz);
    const hp = avg(b.hw);
    const quiz = qp == null ? null : { count: b.quiz.length, percent: Math.round(qp), marks: r1((qp * QUIZ_MAX) / 100), max: QUIZ_MAX };
    const homework = hp == null ? null : { count: b.hw.length, percent: Math.round(hp), marks: r1((hp * HW_MAX) / 100), max: HW_MAX };
    const parts = [quiz, homework].filter(Boolean);
    return {
      quiz,
      homework,
      total: parts.length ? r1(parts.reduce((s, p) => s + p.marks, 0)) : null,
      max: QUIZ_MAX + HW_MAX,
      complete: parts.length === 2, // dono hisse aa gaye?
    };
  };
};

module.exports = { buildTermScores, QUIZ_MAX, HW_MAX };