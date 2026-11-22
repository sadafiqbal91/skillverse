const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Quiz = require("../models/Quiz");
const Attempt = require("../models/Attempt");
const Intervention = require("../models/Intervention");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Note = require("../models/Note");
const { buildProgress } = require("./progressController");
const { buildAnswers } = require("../services/answerService");
const { buildEarlyWarnings } = require("../services/earlyWarningService");

// Kya ye bachcha isi parent ka hai? 🔐
const isMyChild = async (req) => {
  try {
    const parent = await User.findOne({ _id: req.user.userId, organizationId: req.user.organizationId });
    return !!parent && parent.children.some((c) => String(c) === String(req.params.id));
  } catch {
    return false;
  }
};

// Koi query fail ho to poora page na toote
const safe = (query) => query.exec().catch(() => []);

// GET /api/parents/me/children
const myChildren = async (req, res) => {
  const parent = await User.findById(req.user.userId).populate("children", "name email");
  res.json({ count: parent.children.length, children: parent.children });
};

// GET /api/parents/children/:id/progress
const childProgress = async (req, res) => {
  try {
    if (!(await isMyChild(req))) return res.status(403).json({ message: "This is not your child" });
    const child = await User.findById(req.params.id).select("name");
    res.json({ child: child.name, ...(await buildProgress(req.params.id, req.user.organizationId)) });
  } catch (error) {
    res.status(400).json({ message: "Invalid ID" });
  }
};

// GET /api/parents/children/:id/overview  ⭐ Parent dashboard ka sara data
const childOverview = async (req, res) => {
  try {
    if (!(await isMyChild(req))) return res.status(403).json({ message: "This is not your child" });

    const childId = req.params.id;
    const orgId = req.user.organizationId;
    const child = await User.findById(childId).select("name email");
    const name = child.name.split(" ")[0];
    const progress = await buildProgress(childId, orgId);
    const courseIds = progress.courses.map((c) => c.courseId).filter(Boolean);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [upcoming, ivs, assignments, subs, notes, attempts] = await Promise.all([
      safe(Quiz.find({ courseId: { $in: courseIds }, testDate: { $gte: today } }).populate("courseId", "title").sort("testDate").limit(5)),
      safe(Intervention.find({ studentId: childId, organizationId: orgId }).sort("-updatedAt")),
      safe(Assignment.find({ courseId: { $in: courseIds } }).populate("courseId", "title").sort("-createdAt").limit(20)),
      safe(Submission.find({ studentId: childId })),
      safe(Note.find({ organizationId: orgId, recipients: childId }).populate("courseId", "title").sort("-createdAt").limit(5)),
      safe(Attempt.find({ studentId: childId, organizationId: orgId, status: "submitted" }).populate("quizId", "title").sort("-submittedAt").limit(6)),
    ]);

    // 🤝 Teacher ki madad (har topic ka latest case)
    const latest = {};
    for (const iv of ivs) if (!latest[iv.topic]) latest[iv.topic] = iv;
    const help = Object.values(latest)
      .filter((iv) => iv.level !== "resolved")
      .map((iv) => {
        const round = iv.retestsTaken || 0;
        const oneOnOne = iv.level === "one_on_one";
        return {
          topic: iv.topic,
          level: iv.level,
          round,
          maxRounds: 3,
          oneOnOne,
          note: oneOnOne
            ? "All 3 re-tests used. The teacher will meet your child one-on-one."
            : round === 0
              ? "Re-test 1 is ready. Your child can practise now."
              : `Re-test ${round} of 3 done. The teacher sends notes, then the next re-test opens.`,
          noteUr: oneOnOne
            ? "Teeno re-test ho gaye. Ab teacher bachche se alag se milegi."
            : round === 0
              ? "Pehla re-test tayyar hai. Bachcha abhi practice kar sakta hai."
              : `${round} re-test ho gaye (3 mein se). Teacher notes bhejegi, phir agla re-test khulega.`,
        };
      });

    // 📝 Assignments + submission
    const subMap = new Map(subs.map((s) => [String(s.assignmentId), s]));
    const assignmentList = assignments.map((a) => {
      const s = subMap.get(String(a._id));
      const due = a.dueDate || a.dueAt || null;
      const marks = s ? s.marks ?? s.score ?? null : null;
      let state = "pending";
      if (s) state = marks != null || s.status === "graded" ? "graded" : "submitted";
      else if (due && new Date(due) < now) state = "late";
      return {
        _id: a._id,
        title: a.title,
                course: a.courseId?.title,
        courseId: a.courseId?._id,
        instructions: a.instructions || a.description || "",
        image: a.image || null, // 🖼️ teacher ki picture
        imageCaption: a.imageCaption || "",

        due,
        state,
        marks,
        max: a.maxMarks ?? a.totalMarks ?? null,
        feedback: s?.feedback || "",
      };
    });

    // 🟢🟡🔴 Status + wajah (English + Roman Urdu)
    const avg = progress.summary.quizzesTaken ? progress.summary.averageQuizPercent : null;
    const weak = progress.weakTopics;
    const oneOnOne = help.filter((h) => h.oneOnOne);
    const late = assignmentList.filter((a) => a.state === "late");
    const early = (await buildEarlyWarnings(orgId).catch(() => [])).filter((w) => String(w.studentId) === String(childId));
    let status = "green";
    let reason = `${name} is doing well. Keep encouraging!`;
    let reasonUr = `${name} ka kaam achha chal raha hai. Shabash dete rahein!`;

    if (oneOnOne.length) {
      status = "red";
      reason = `${name} needs extra help in ${oneOnOne[0].topic}. The teacher will meet ${name} one-on-one.`;
      reasonUr = `${name} ko ${oneOnOne[0].topic} mein mushkil hai. Teacher khud alag se milegi.`;
    } else if (weak.length >= 2 || (avg != null && avg < 50)) {
      status = "red";
      const what = weak.slice(0, 2).join(" and ") || "quizzes";
      reason = `${name} is finding ${what} difficult. Please help with practice at home.`;
      reasonUr = `${name} ko ${what.replace(" and ", " aur ")} mein madad chahiye. Ghar par practice karwayein.`;
    } else if (early.length) {
      // 🔮 Early warning: abhi fail nahi, lekin khatra
      status = "yellow";
      const w = early[0];
      const why = w.reasons.map((r) => r.text).join(", ");
      const whyUr = w.reasons.map((r) => r.text
        .replace("Scores dropping", "Marks gir rahe hain")
        .replace("No activity for", "Itne din se kuch nahi kiya:")
        .replace("homework missing", "homework baqi")
        .replace("Last quiz", "Pichla quiz")).join(", ");
      reason = `Early warning in ${w.course}: ${why}. Please sit with ${name} for 15 minutes today.`;
      reasonUr = `${w.course} mein pehle se khabardar: ${whyUr}. Aaj ${name} ke saath 15 minute baithein.`;
    } else if (help.length) {
      status = "yellow";
      reason = `${name} is practising ${help[0].topic}. ${help[0].note}`;
      reasonUr = `${name} ki ${help[0].topic} ki practice chal rahi hai. ${help[0].noteUr}`;
    } else if (late.length) {
      status = "yellow";
      reason = `${late.length} assignment(s) not submitted yet.`;
      reasonUr = `${late.length} assignment abhi tak jama nahi hua.`;
    } else if (weak.length || (avg != null && avg < 70)) {
      status = "yellow";
      reason = `${name} is doing okay. A little more practice will help.`;
      reasonUr = `${name} theek ja raha hai. Thodi aur practice se aur behtar hoga.`;
    }

    res.json({
      child: { _id: child._id, name: child.name, email: child.email },
      status,
      reason,
      reasonUr,
      summary: progress.summary,
      courses: progress.courses,
      topics: progress.topics,
      weakTopics: weak,
      recentAttempts: attempts.map((a) => ({
        _id: a._id,
        quiz: a.quizId?.title || "Quiz",
        percent: a.percent,
        kind: a.kind,
        submittedAt: a.submittedAt,
      })),
      upcoming: upcoming.map((q) => ({ _id: q._id, title: q.title, course: q.courseId?.title, testDate: q.testDate })),
      help,
      assignments: assignmentList,
      notes: notes.map((n) => ({
        _id: n._id,
        title: n.title,
        topic: n.topic,
        course: n.courseId?.title,
        createdAt: n.createdAt,
        text: n.text || "",
        fileUrl: n.fileUrl,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/parents/children/:id/attempts/:attemptId  👁️ View answers
const attemptAnswers = async (req, res) => {
  try {
    if (!(await isMyChild(req))) return res.status(403).json({ message: "This is not your child" });
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      studentId: req.params.id,
      organizationId: req.user.organizationId,
    }).populate("quizId", "title");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    res.json(await buildAnswers(attempt));
  } catch (error) {
    res.status(400).json({ message: "Invalid ID" });
  }
};

// POST /api/parents/children/:id/child-mode  🧒 Bachcha parent ke phone par parhe
const childMode = async (req, res) => {
  try {
    if (!(await isMyChild(req))) return res.status(403).json({ message: "This is not your child" });
    const child = await User.findOne({ _id: req.params.id, organizationId: req.user.organizationId, role: "student" });
    if (!child) return res.status(404).json({ message: "Child not found" });
    const org = await Organization.findById(req.user.organizationId);

    const token = jwt.sign(
      { userId: child._id, role: "student", organizationId: org._id, childMode: true, parentId: req.user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );
    res.json({
      token,
      user: { id: child._id, name: child.name, role: "student" },
      organization: { name: org.name, type: org.type, settings: org.settings },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { myChildren, childProgress, childOverview, attemptAnswers, childMode };