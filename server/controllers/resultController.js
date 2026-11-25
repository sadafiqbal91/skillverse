const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const Enrollment = require("../models/Enrollment");
const Submission = require("../models/Submission");
const Intervention = require("../models/Intervention");
const User = require("../models/User");
const { notify, parentsOf } = require("../services/interventionService");
const { buildTermScores } = require("../services/termScoreService");

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  res.status(500).json({ message: error.message });
};

// Teacher → only own course. Principal → any course in the institute.
const findCourse = (courseId, req) => {
  const filter = { _id: courseId, organizationId: req.user.organizationId };
  if (req.user.role === "instructor") filter.instructorId = req.user.userId;
  return Course.findOne(filter).select("title");
};

const avg = (list) => (list.length ? Math.round(list.reduce((s, x) => s + x, 0) / list.length) : null);

// GET /api/results/course/:courseId → gradebook + quiz participation
const courseResults = async (req, res) => {
  try {
    const course = await findCourse(req.params.courseId, req);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const [enrollments, quizzes, attempts] = await Promise.all([
      Enrollment.find({ courseId: course._id }).populate("studentId", "name").select("studentId progressPercent"),
      Quiz.find({ courseId: course._id, kind: { $ne: "retest" } }).select("title testDate kind").sort("createdAt"),
      Attempt.find({ courseId: course._id, status: "submitted" }).select("studentId quizId kind percent passed"),
    ]);
    const revisionIds = new Set(quizzes.filter((q) => q.kind === "revision").map((q) => String(q._id)));
    const term = await buildTermScores(enrollments.filter((e) => e.studentId).map((e) => e.studentId._id), [course._id]);

    const rows = enrollments.filter((e) => e.studentId).map((e) => {
      const mine = attempts.filter((a) => a.studentId.equals(e.studentId._id));
      const regular = mine.filter((a) => a.kind !== "retest");
      const cells = {};
      for (const q of quizzes) {
        const qa = regular.filter((a) => a.quizId && a.quizId.equals(q._id));
        cells[String(q._id)] = qa.length ? { best: Math.max(...qa.map((a) => a.percent)), tries: qa.length } : null;
      }
      const taken = Object.values(cells).filter(Boolean);
      const revTaken = Object.entries(cells).filter(([k, c]) => c && revisionIds.has(k)).map(([, c]) => c.best);
      const retests = mine.filter((a) => a.kind === "retest");
      return {
        _id: e.studentId._id,
        name: e.studentId.name,
        progress: e.progressPercent,
        cells,
        average: avg(taken.map((c) => c.best)), // 📝 revision marks bhi isi mein gin'te hain
        revisionAverage: avg(revTaken),
        retests: { total: retests.length, passed: retests.filter((a) => a.passed).length },
        term: term(e.studentId._id, course._id), // 📊 15 + 10 = 25
      };
    });

    const quizStats = quizzes.map((q) => {
      const k = String(q._id);
      const done = rows.filter((r) => r.cells[k]);
      return {
        _id: q._id, title: q.title, testDate: q.testDate, kind: q.kind,
        took: done.length, total: rows.length,
        average: done.length ? Math.round(done.reduce((s, r) => s + r.cells[k].best, 0) / done.length) : null,
        notTaken: rows.filter((r) => !r.cells[k]).map((r) => r.name),
      };
    });

    res.json({ course, students: rows, quizzes: quizStats });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/results/quiz/:quizId/remind → teacher: nudge students who haven't taken it
const remindQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, organizationId: req.user.organizationId });
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    const course = await findCourse(quiz.courseId, req);
    if (!course) return res.status(403).json({ message: "This is not your course" });

    const [ens, took] = await Promise.all([
      Enrollment.find({ courseId: quiz.courseId }).select("studentId"),
      Attempt.distinct("studentId", { quizId: quiz._id, status: "submitted" }),
    ]);
    const tookSet = new Set(took.map(String));
    const pending = ens.map((e) => e.studentId).filter((id) => !tookSet.has(String(id)));
    if (!pending.length) return res.json({ message: "Everyone has taken this quiz 🎉" });

    const parents = (await Promise.all(pending.map((id) => parentsOf(id)))).flat();
    await notify(req.user.organizationId, [...pending, ...parents], {
      type: "quiz_reminder",
      title: `⏰ Reminder: ${quiz.title}`,
      message: `Please take "${quiz.title}" in ${course.title}. It only takes a few minutes.`,
      meta: { courseId: quiz.courseId, quizId: quiz._id },
    });
    res.json({ message: `Reminder sent to ${pending.length} student(s) and their parents 🔔` });
  } catch (error) {
    handleError(res, error);
  }
};

const IV_TEXT = {
  needs_practice: ["🌱", "weak, re-test opened"],
  retest_failed: ["❌", "re-test not passed"],
  retest_passed: ["🎉", "recovered after re-test"],
  notes_worked: ["🎉", "recovered after teacher's notes"],
  notes_sent: ["📄", "teacher sent notes"],
  all_retests_failed: ["🙋", "needs 1-on-1 help"],
  recovered: ["🎉", "recovered"],
  questions_needed: ["➕", "waiting for new questions"],
};

// GET /api/results/student/:studentId?courseId=... → full activity timeline
const studentTimeline = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (req.user.role === "instructor" && !courseId) return res.status(400).json({ message: "courseId is required" });
    if (courseId && !(await findCourse(courseId, req))) return res.status(404).json({ message: "Course not found" });

    const student = await User.findOne({ _id: req.params.studentId, organizationId: req.user.organizationId, role: "student" }).select("name email");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const f = { studentId: student._id };
    if (courseId) f.courseId = courseId;

    const [attempts, subs, ivs] = await Promise.all([
      Attempt.find({ ...f, status: "submitted" }).populate("quizId", "title kind").select("quizId kind percent passed submittedAt"),
      Submission.find(f).populate("assignmentId", "title maxMarks").select("assignmentId status marks isLate createdAt gradedAt"),
      Intervention.find(f).select("topic history"),
    ]);

    const events = [];
    attempts.forEach((a) => events.push({
      icon: a.kind === "retest" ? "🔁" : a.quizId?.kind === "revision" ? "📝" : "🧠",
      text: `${a.kind === "retest" ? "Re-test" : a.quizId?.title || "Quiz"}: ${a.percent}%`,
      good: a.passed, at: a.submittedAt,
    }));
    subs.forEach((s) => {
      const t = s.assignmentId?.title || "Assignment";
      events.push({ icon: "📤", text: `Submitted "${t}"${s.isLate ? " (late)" : ""}`, at: s.createdAt });
      if (s.status === "graded") events.push({ icon: "✅", text: `"${t}" graded: ${s.marks}/${s.assignmentId?.maxMarks}`, good: true, at: s.gradedAt });
    });
    ivs.forEach((iv) => iv.history.forEach((h) => {
      const m = IV_TEXT[h.event];
      if (!m) return;
      events.push({
        icon: m[0],
        text: `${iv.topic}: ${m[1]}${h.percent != null ? ` (${h.percent}%)` : ""}${h.round ? ` · round ${h.round}` : ""}`,
        good: m[0] === "🎉" ? true : m[0] === "❌" || m[0] === "🙋" ? false : undefined,
        at: h.at,
      });
    }));

    events.sort((a, b) => new Date(b.at) - new Date(a.at));
    res.json({ student, events });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { courseResults, remindQuiz, studentTimeline };