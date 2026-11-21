const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Attempt = require("../models/Attempt");
const Note = require("../models/Note");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Intervention = require("../models/Intervention");
const Notification = require("../models/Notification");
const { notify } = require("./interventionService");

const DAY = 24 * 60 * 60 * 1000;
const PK = 5 * 60 * 60 * 1000; // Pakistan = UTC+5

const startOfTodayPK = () => {
  const pk = new Date(Date.now() + PK);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()) - PK);
};

const dayRange = (which = "today") => {
  const today = startOfTodayPK();
  if (which === "yesterday") return { start: new Date(today.getTime() - DAY), end: today };
  return { start: today, end: new Date(today.getTime() + DAY) };
};

const safe = (q) => q.exec().catch(() => []);
const safeCount = (q) => q.exec().catch(() => 0);

const buildDailySummary = async (organizationId, which = "today") => {
  const orgId = new mongoose.Types.ObjectId(String(organizationId));
  const { start, end } = dayRange(which);
  const inDay = { $gte: start, $lt: end };
  const threeDaysAgo = new Date(Date.now() - 3 * DAY);

  const [attempts, notesSent, assignmentsGiven, submitted, graded, recovered, newCases, pending, oneOnOne] = await Promise.all([
    safe(Attempt.find({ organizationId: orgId, status: "submitted", submittedAt: inDay }).select("percent studentId")),
    safeCount(Note.countDocuments({ organizationId: orgId, createdAt: inDay })),
    safeCount(Assignment.countDocuments({ organizationId: orgId, createdAt: inDay })),
    safeCount(Submission.countDocuments({ organizationId: orgId, createdAt: inDay })),
    safeCount(Submission.countDocuments({ organizationId: orgId, gradedAt: inDay })),
    safeCount(Intervention.countDocuments({ organizationId: orgId, level: "resolved", updatedAt: inDay })),
    safeCount(Intervention.countDocuments({ organizationId: orgId, createdAt: inDay })),
    safe(
      Submission.find({ organizationId: orgId, status: "submitted", createdAt: { $lt: threeDaysAgo } })
        .select("-attachment")
        .populate("studentId", "name")
        .populate({ path: "courseId", select: "title instructorId", populate: { path: "instructorId", select: "name" } })
    ),
    safe(
      Intervention.find({ organizationId: orgId, level: "one_on_one" })
        .populate("studentId", "name")
        .populate("courseId", "title")
        .sort("-updatedAt")
        .limit(10)
    ),
  ]);

  const byTeacher = {};
  for (const s of pending) {
    const t = s.courseId?.instructorId;
    const key = String(t?._id || "unknown");
    byTeacher[key] = byTeacher[key] || { teacher: t?.name || "Teacher", count: 0, oldest: s.createdAt };
    byTeacher[key].count += 1;
    if (s.createdAt < byTeacher[key].oldest) byTeacher[key].oldest = s.createdAt;
  }

  const quizAvg = attempts.length ? Math.round(attempts.reduce((a, b) => a + (b.percent || 0), 0) / attempts.length) : null;

  return {
    which,
    date: start,
    stats: {
      quizzes: attempts.length,
      quizAvg,
      activeStudents: new Set(attempts.map((a) => String(a.studentId))).size,
      notesSent, assignmentsGiven, submitted, graded, recovered, newCases,
    },
    attention: {
      oneOnOne: oneOnOne.map((iv) => ({
        _id: iv._id,
        studentId: iv.studentId?._id,
        student: iv.studentId?.name || "Student",
        topic: iv.topic,
        course: iv.courseId?.title,
      })),
      gradingPending: Object.values(byTeacher).sort((a, b) => b.count - a.count),
    },
  };
};

const summaryText = (s) => {
  const parts = [
    `${s.stats.quizzes} quizzes${s.stats.quizAvg != null ? ` (avg ${s.stats.quizAvg}%)` : ""}`,
    `${s.stats.notesSent} notes sent`,
    `${s.stats.recovered} recovered`,
    `${s.stats.graded} assignments checked`,
  ];
  const warn = [];
  if (s.attention.oneOnOne.length) warn.push(`${s.attention.oneOnOne.length} one-on-one case(s)`);
  const pend = s.attention.gradingPending.reduce((a, b) => a + b.count, 0);
  if (pend) warn.push(`${pend} assignment(s) waiting 3+ days`);
  return `${parts.join(" · ")}.${warn.length ? ` ⚠️ ${warn.join(", ")}.` : " ✅ Nothing urgent."}`;
};

const sendDailySummary = async (organizationId, { force = false, which = "today" } = {}) => {
  const type = which === "yesterday" ? "morning_summary" : "daily_summary";
  if (!force) {
    const already = await Notification.exists({ organizationId, type, createdAt: { $gte: startOfTodayPK() } }).catch(() => null);
    if (already) return { sent: false, reason: "already sent today" };
  }
  const [org, admins, summary] = await Promise.all([
    Organization.findById(organizationId).select("name"),
    User.find({ organizationId, role: "orgadmin" }).select("_id"),
    buildDailySummary(organizationId, which),
  ]);
  if (!admins.length) return { sent: false, reason: "no admin" };

  await notify(organizationId, admins.map((a) => a._id), {
    type,
    title: which === "yesterday" ? `☀️ Good morning! Yesterday at ${org?.name || "school"}` : `📊 Today at ${org?.name || "school"}`,
    message: summaryText(summary),
    meta: {},
  });
  return { sent: true, summary };
};

module.exports = { buildDailySummary, sendDailySummary, startOfTodayPK };