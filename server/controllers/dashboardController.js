const mongoose = require("mongoose");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Attempt = require("../models/Attempt");
const Intervention = require("../models/Intervention");
const Submission = require("../models/Submission");
const Note = require("../models/Note");
const Organization = require("../models/Organization");
const SchoolClass = require("../models/SchoolClass");
const { buildProgress } = require("./progressController");
const { buildEarlyWarnings } = require("../services/earlyWarningService");
const { notify, parentsOf } = require("../services/interventionService");

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE = ["needs_practice", "intervention", "one_on_one"];

// GET /api/dashboard/instructor → 👨‍🏫 teacher's control room
const instructorDashboard = async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const org = await Organization.findById(organizationId);
    const passing = org.settings.passingMarks;

    const courses = await Course.find({ organizationId, instructorId: userId });
    const result = [];

    for (const c of courses) {
      const enrollments = await Enrollment.find({ courseId: c._id }).populate("studentId", "name");
      const attempts = await Attempt.find({ courseId: c._id, status: "submitted", kind: "regular" }).select("studentId percent topicScores submittedAt");
      const ivs = await Intervention.find({ courseId: c._id, level: { $in: ACTIVE } });
      const pendingGrading = await Submission.countDocuments({ courseId: c._id, status: "submitted" });

      const tm = {};
      for (const a of attempts) {
        for (const t of a.topicScores) {
          tm[t.topic] = tm[t.topic] || { correct: 0, total: 0 };
          tm[t.topic].correct += t.correct;
          tm[t.topic].total += t.total;
        }
      }
      const topics = Object.entries(tm)
        .map(([topic, t]) => ({ topic, percent: Math.round((t.correct / t.total) * 100) }))
        .sort((a, b) => a.percent - b.percent);

      const atRisk = [];
      for (const e of enrollments) {
        if (!e.studentId) continue;
        const mine = attempts.filter((a) => a.studentId.equals(e.studentId._id));
        const avg = mine.length ? Math.round(mine.reduce((s, a) => s + a.percent, 0) / mine.length) : null;
        const lastActive = Math.max(e.updatedAt.getTime(), ...mine.map((a) => a.submittedAt.getTime()));
        const inactiveDays = Math.floor((Date.now() - lastActive) / DAY);
        const reasons = [];
        if (avg !== null && avg < passing) reasons.push(`Quiz average ${avg}%`);
        if (inactiveDays >= 5) reasons.push(`Inactive for ${inactiveDays} days`);
        if (reasons.length) atRisk.push({ name: e.studentId.name, reasons });
      }

      const avgProgress = enrollments.length ? Math.round(enrollments.reduce((s, e) => s + e.progressPercent, 0) / enrollments.length) : 0;
      const avgQuiz = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percent, 0) / attempts.length) : 0;

      result.push({
        courseId: c._id, title: c.title, status: c.status,
        students: enrollments.length, averageProgress: avgProgress,
        quizAttempts: attempts.length, averageQuizPercent: avgQuiz,
        topics, classWeakTopics: topics.filter((t) => t.percent < passing).map((t) => t.topic),
        interventions: {
          needs_practice: ivs.filter((i) => i.level === "needs_practice").length,
          intervention: ivs.filter((i) => i.level === "intervention").length,
          one_on_one: ivs.filter((i) => i.level === "one_on_one").length,
        },
        pendingGrading, atRisk,
      });
    }
    res.json({ courses: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/admin → 🏫 principal's control room
const adminDashboard = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const orgId = new mongoose.Types.ObjectId(String(organizationId)); // aggregate needs a real ObjectId
    const org = await Organization.findById(organizationId);
    const weekAgo = new Date(Date.now() - 7 * DAY);

    const [students, instructors, parents, publishedCourses, newCases, resolved] = await Promise.all([
      User.countDocuments({ organizationId, role: "student" }),
      User.countDocuments({ organizationId, role: "instructor" }),
      User.countDocuments({ organizationId, role: "parent" }),
      Course.countDocuments({ organizationId, status: "published" }),
      Intervention.countDocuments({ organizationId, createdAt: { $gte: weekAgo }, level: { $ne: "watch" } }),
      Intervention.countDocuments({ organizationId, resolvedAt: { $gte: weekAgo } }),
    ]);

    const topWeak = await Intervention.aggregate([
      { $match: { organizationId: orgId, level: { $in: ACTIVE } } },
      { $group: { _id: "$topic", students: { $sum: 1 } } },
      { $sort: { students: -1 } },
      { $limit: 5 },
    ]);

    // 👨‍🏫 Each teacher's work (measured by results, not hours)
    const teachers = await User.find({ organizationId, role: "instructor" }).select("name");
    const teacherStats = [];
    for (const tch of teachers) {
      const courseIds = (await Course.find({ instructorId: tch._id }).select("_id")).map((c) => c._id);
      const [studentCount, notesSent, studentsHelped, pendingGrading] = await Promise.all([
        Enrollment.countDocuments({ courseId: { $in: courseIds } }),
        Note.countDocuments({ createdBy: tch._id }),
        Intervention.countDocuments({ courseId: { $in: courseIds }, level: "resolved" }),
        Submission.countDocuments({ courseId: { $in: courseIds }, status: "submitted" }),
      ]);
      teacherStats.push({ _id: tch._id, name: tch.name, courses: courseIds.length, students: studentCount, notesSent, studentsHelped, pendingGrading });
    }

    // 📚 Every course at a glance
    const courses = await Course.find({ organizationId }).populate("instructorId", "name").select("title status instructorId");
    const courseStats = await Promise.all(courses.map(async (c) => {
      const [count, attempts, needHelp] = await Promise.all([
        Enrollment.countDocuments({ courseId: c._id }),
        Attempt.find({ courseId: c._id, status: "submitted", kind: "regular" }).select("percent"),
        Intervention.countDocuments({ courseId: c._id, level: { $in: ACTIVE } }),
      ]);
      return {
        _id: c._id, title: c.title, status: c.status, teacher: c.instructorId?.name, students: count,
        averageQuiz: attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percent, 0) / attempts.length) : null,
        needHelp,
      };
    }));

    // ⚠️ Students who need the teacher's help right now (whole school)
    const cases = await Intervention.find({ organizationId, level: { $in: ["intervention", "one_on_one"] } })
      .populate("studentId", "name")
      .populate("courseId", "title")
      .select("studentId courseId topic level latestPercent");
    const map = {};
    for (const c of cases) {
      if (!c.studentId) continue;
      const k = String(c.studentId._id);
      map[k] = map[k] || { _id: c.studentId._id, name: c.studentId.name, items: [] };
      map[k].items.push({ topic: c.topic, course: c.courseId?.title, level: c.level, percent: c.latestPercent });
    }

    res.json({
      institute: org.name, type: org.type,
      counts: { students, instructors, parents, publishedCourses },
      thisWeek: { newWeakTopicCases: newCases, resolved },
      topWeakTopics: topWeak.map((t) => ({ topic: t._id, students: t.students })),
      teachers: teacherStats,
      courses: courseStats,
      atRisk: Object.values(map),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/dashboard/admin/students?q=ali → 🔍 search by name
const searchStudents = async (req, res) => {
  const q = (req.query.q || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const students = await User.find({
    organizationId: req.user.organizationId, role: "student", name: { $regex: q, $options: "i" },
  }).select("name email").limit(10);
  res.json({ count: students.length, students });
};

// GET /api/dashboard/admin/students/:id → 📋 Parent Quick View
const studentQuickView = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, organizationId: req.user.organizationId, role: "student" }).select("name email");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const [progress, parents, activeHelp, submissions] = await Promise.all([
      buildProgress(student._id, req.user.organizationId),
      User.find({ role: "parent", children: student._id }).select("name email"),
      Intervention.find({ studentId: student._id, level: { $in: ACTIVE } }).populate("courseId", "title").select("topic level latestPercent notesSent courseId"),
      Submission.find({ studentId: student._id }).populate("assignmentId", "title maxMarks").select("status marks feedback isLate"),
    ]);
    res.json({ student, parents, ...progress, activeHelp, submissions });
  } catch (error) {
    res.status(400).json({ message: "Invalid ID" });
  }
};

// GET /api/dashboard/early-warning → 🔮 kaun agle test mein mushkil mein aa sakta hai
const earlyWarning = async (req, res) => {
  try {
    if (!["instructor", "orgadmin"].includes(req.user.role)) return res.status(403).json({ message: "Only teachers and principals can see this" });
    const opts = req.user.role === "instructor" ? { instructorId: req.user.userId } : {};
    const students = await buildEarlyWarnings(req.user.organizationId, opts);
    res.json({ count: students.length, students });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/dashboard/early-warning/remind { studentId, courseId } → 🔔 bache + parent ko pyara sa yaad dilana
const remindEarly = async (req, res) => {
  try {
    if (!["instructor", "orgadmin"].includes(req.user.role)) return res.status(403).json({ message: "Only teachers and principals can see this" });
    const { studentId, courseId } = req.body;
    const filter = { _id: courseId, organizationId: req.user.organizationId };
    if (req.user.role === "instructor") filter.instructorId = req.user.userId;
    const course = await Course.findOne(filter).select("title");
    if (!course) return res.status(404).json({ message: "Course not found" });
    const enrolled = await Enrollment.exists({ courseId: course._id, studentId });
    if (!enrolled) return res.status(404).json({ message: "Student is not in this course" });

    const student = await User.findById(studentId).select("name");
    const first = (student?.name || "").split(" ")[0] || "there";
    await notify(req.user.organizationId, [studentId], {
      type: "early_warning",
      title: "💪 " + course.title + ": let's get ready together",
      message: "Hi " + first + "! Your teacher wants to help you before the next test. Finish your homework and practise a little today. You can do it! 🌟",
      meta: { courseId: course._id },
    });
    const parents = await parentsOf(studentId);
    if (parents.length) {
      await notify(req.user.organizationId, parents, {
        type: "early_warning",
        title: "🔮 " + (student?.name || "Your child") + " may need a little help in " + course.title,
        message: "We noticed this early, before the next test. Please sit with your child for 15 minutes today and check the homework.",
        meta: { courseId: course._id },
      });
    }
    // 🏫 Principal ko bhi batao (class + teacher ke naam ke saath)
    const admins = await User.find({ organizationId: req.user.organizationId, role: "orgadmin", _id: { $ne: req.user.userId } }).select("_id");
    if (admins.length) {
      const [sender, klass] = await Promise.all([
        User.findById(req.user.userId).select("name"),
        SchoolClass.findOne({ organizationId: req.user.organizationId, courseIds: course._id }).select("name"),
      ]);
      await notify(req.user.organizationId, admins.map((a) => a._id), {
        type: "early_warning_sent",
        title: "🔮 " + (klass ? klass.name + " · " : "") + course.title + ": early reminder sent",
        message: (sender?.name || "A teacher") + " noticed " + (student?.name || "a student") + " early and sent a reminder" + (parents.length ? " to the student and parents." : " to the student."),
        meta: { courseId: course._id },
      });
    }

    res.json({ message: "Reminder sent to the student" + (parents.length ? " and parents" : "") + " 🔔" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { instructorDashboard, adminDashboard, searchStudents, studentQuickView, earlyWarning, remindEarly };