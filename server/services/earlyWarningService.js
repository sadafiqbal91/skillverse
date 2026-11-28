// 🔮 EARLY WARNING: fail hone se PEHLE pakro
// Har bache ko 4 cheezon par dekho:
//   📉 scores gir rahe hain?   😴 kai din se kuch nahi kiya?
//   📝 homework jama nahi?     📅 agla test qareeb hai?
// Jo bache pehle se teacher ki madad (notes / 1-on-1) mein hain, unhein yahan nahi dikhate.
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Attempt = require("../models/Attempt");
const Quiz = require("../models/Quiz");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Intervention = require("../models/Intervention");
const Organization = require("../models/Organization");

const DAY = 24 * 60 * 60 * 1000;
const key = (a, b) => String(a) + ":" + String(b);

const buildEarlyWarnings = async (organizationId, { instructorId } = {}) => {
  const org = await Organization.findById(organizationId).select("settings");
  const passing = (org && org.settings && org.settings.passingMarks) || 50;

  const cFilter = { organizationId, status: "published" };
  if (instructorId) cFilter.instructorId = instructorId;
  const courses = await Course.find(cFilter).select("title");
  if (!courses.length) return [];
  const ids = courses.map((c) => c._id);
  const titleOf = Object.fromEntries(courses.map((c) => [String(c._id), c.title]));
  const now = Date.now();

  const [ens, attempts, quizzes, assignments, subs, ivs] = await Promise.all([
    Enrollment.find({ courseId: { $in: ids } }).populate("studentId", "name").select("courseId studentId updatedAt createdAt"),
    Attempt.find({ courseId: { $in: ids }, status: "submitted", kind: "regular" }).select("courseId studentId quizId percent submittedAt").sort("submittedAt"),
    Quiz.find({ courseId: { $in: ids }, kind: { $ne: "retest" }, testDate: { $gte: new Date(now - DAY), $lte: new Date(now + 4 * DAY) } })
      .select("courseId title testDate").sort("testDate"),
    Assignment.find({ courseId: { $in: ids }, dueDate: { $lt: new Date(now), $gte: new Date(now - 14 * DAY) } }).select("courseId title dueDate"),
    Submission.find({ courseId: { $in: ids } }).select("assignmentId studentId"),
    Intervention.find({ courseId: { $in: ids }, level: { $in: ["intervention", "one_on_one", "resolved"] } }).select("courseId studentId level resolvedAt"),
  ]);

  const alreadyHelped = new Set(ivs.filter((i) => i.level !== "resolved").map((i) => key(i.studentId, i.courseId)));
  // 🎉 Re-test se recover hua? To purane low quiz par dobara warning nahi
  const recoveredAt = new Map();
  for (const i of ivs) {
    if (i.level !== "resolved" || !i.resolvedAt) continue;
    const k = key(i.studentId, i.courseId);
    if (!recoveredAt.has(k) || recoveredAt.get(k) < i.resolvedAt) recoveredAt.set(k, i.resolvedAt);
  }
  const submitted = new Set(subs.map((s) => key(s.studentId, s.assignmentId)));
  const out = [];

  for (const e of ens) {
    if (!e.studentId) continue;
    const sid = e.studentId._id;
    const cid = e.courseId;
    if (alreadyHelped.has(key(sid, cid))) continue;

    const mine = attempts.filter((a) => a.studentId.equals(sid) && a.courseId.equals(cid));
    const reasons = [];
    let score = 0;

    // 📉 Scores gir rahe hain? (aakhri 3 quiz)
    const last3 = mine.slice(-3);
    let dropping = false;
    if (last3.length >= 2 && last3[0].percent - last3[last3.length - 1].percent >= 15) {
      dropping = true;
      score += 3;
      reasons.push({ icon: "📉", text: "Scores dropping (" + last3.map((a) => a.percent).join(" → ") + "%)" });
    }

    // 📊 Aakhri quiz pass ke qareeb ya neeche
    const latest = mine[mine.length - 1];
    const recovered = latest && recoveredAt.get(key(sid, cid)) > new Date(latest.submittedAt);
    if (latest && !dropping && !recovered) {
      if (latest.percent < passing) {
        score += 2;
        reasons.push({ icon: "📊", text: "Last quiz " + latest.percent + "%" });
      } else if (latest.percent < passing + 10) {
        score += 1;
        reasons.push({ icon: "📊", text: "Last quiz " + latest.percent + "%, close to the pass mark" });
      }
    }

    // 😴 Kai din se kuch nahi kiya
    const lastActive = Math.max(new Date(e.updatedAt || e.createdAt).getTime(), latest ? new Date(latest.submittedAt).getTime() : 0);
    const idle = Math.floor((now - lastActive) / DAY);
    if (idle >= 5) {
      score += 2;
      reasons.push({ icon: "😴", text: "No activity for " + idle + " days" });
    }

    // 📝 Homework jama nahi
    const missing = assignments.filter((a) => a.courseId.equals(cid) && !submitted.has(key(sid, a._id)));
    if (missing.length) {
      score += 2;
      reasons.push({ icon: "📝", text: missing.length + " homework missing" });
    }

    // 📅 Agla test qareeb (jo abhi diya nahi)
    const next = quizzes.find((q) => q.courseId.equals(cid) && !mine.some((a) => a.quizId && a.quizId.equals(q._id)));
    if (score >= 2 && next) score += 1;

    if (score >= 2) {
      out.push({
        studentId: sid,
        name: e.studentId.name,
        courseId: cid,
        course: titleOf[String(cid)],
        level: score >= 4 ? "high" : "medium",
        score,
        reasons,
        nextTest: next ? { title: next.title, testDate: next.testDate } : null,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score);
};

module.exports = { buildEarlyWarnings };