const SchoolClass = require("../models/SchoolClass");
const Course = require("../models/Course");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Intervention = require("../models/Intervention");
const Assignment = require("../models/Assignment");
const Quiz = require("../models/Quiz");
const Note = require("../models/Note");
const Module = require("../models/Module");
const { notify } = require("../services/interventionService");
const { buildEarlyWarnings } = require("../services/earlyWarningService");

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIVE = ["needs_practice", "intervention", "one_on_one"];

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: error.message });
};

// Sirf apne institute ke teacher / courses
const cleanBody = async (req) => {
  const org = req.user.organizationId;
  const out = {};
  if (req.body.name !== undefined) {
    out.name = String(req.body.name || "").trim().slice(0, 60);
    if (!out.name) throw Object.assign(new Error("Name is required"), { name: "ValidationError" });
  }
  if (req.body.classTeacherId !== undefined) {
    out.classTeacherId = req.body.classTeacherId || undefined;
    if (out.classTeacherId && !(await User.exists({ _id: out.classTeacherId, organizationId: org, role: "instructor" }))) {
      throw Object.assign(new Error("Teacher not found"), { name: "ValidationError" });
    }
  }
  if (Array.isArray(req.body.courseIds)) {
    const ok = await Course.find({ _id: { $in: req.body.courseIds }, organizationId: org }).select("_id");
    out.courseIds = ok.map((c) => c._id);
  }
  if (req.body.testsPerWeek !== undefined) {
    out.testsPerWeek = Math.min(10, Math.max(1, Math.round(Number(req.body.testsPerWeek) || 2)));
  }
  if (Array.isArray(req.body.timetable)) {
    out.timetable = req.body.timetable
      .filter((t) => DAYS.includes(t.day) && /^\d{1,2}:\d{2}$/.test(t.time || "") && t.courseId)
      .slice(0, 60)
      .map((t) => ({ day: t.day, time: t.time, courseId: t.courseId }));
  }
  return out;
};

// 🗓️ Kisi bhi din ke hafte ka shuru (Somwar)
const DAY_MS = 24 * 60 * 60 * 1000;
const weekStart = (from = new Date()) => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const back = (d.getDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY_MS);
};

// ⚖️ Baari: har hafte "per" subjects, sab ho jayein to phir pehle se
const rotation = (n, per, slot) => Array.from({ length: Math.min(per, n) }, (_, i) => (slot * per + i) % n);

// 🔔 "Is hafte aap ki baari": har teacher ko har hafte sirf EK baar
const sendTurnAlerts = async (org, classes, ws) => {
  const day = ws.toISOString().slice(0, 10);
  for (const k of classes) {
    for (const p of k.plan.thisWeek) {
      if (!p.teacherId || p.done) continue;
      const key = day + ":" + p.courseId;
      try {
        // Atomic: do log ek saath page kholen tab bhi 🔔 do baar na jaye
        const r = await SchoolClass.updateOne({ _id: k._id, planNotified: { $ne: key } }, { $push: { planNotified: { $each: [key], $slice: -60 } } });
        if (!r.modifiedCount) continue;
        const need = [p.quiz ? null : "1 quiz", p.homework ? null : "1 homework"].filter(Boolean).join(" + ");
        await notify(org, [p.teacherId], {
          type: "plan_turn",
          title: "⚖️ Your turn this week · " + k.name,
          message: p.title + ": please give " + need + " this week." + (p.topics.length ? " Topics: " + p.topics.join(", ") : ""),
          meta: { courseId: p.courseId },
        });
      } catch (e) {
        // 🔔 na ja saki to page na ruke
      }
    }
  }
};

// 🌳 Tree banao (principal: sab, class teacher: sirf apni class)
const buildTree = async (org, classFilter = {}) => {
    const [classes, teachers, courses, warnings] = await Promise.all([
      SchoolClass.find({ organizationId: org, ...classFilter }).populate("classTeacherId", "name").sort("name"),
      User.find({ organizationId: org, role: "instructor" }).select("name").sort("name"),
      Course.find({ organizationId: org }).populate("instructorId", "name").select("title instructorId status").sort("title"),
      buildEarlyWarnings(org),
    ]);
    const courseInfo = Object.fromEntries(courses.map((c) => [String(c._id), c]));
    const ids = courses.map((c) => c._id);

    const [enrolls, helps, asg, quizzes, notes, nowTopics] = await Promise.all([
      Enrollment.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]),
      Intervention.aggregate([{ $match: { courseId: { $in: ids }, level: { $in: ACTIVE } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]),
      Assignment.find({ courseId: { $in: ids } }).select("title courseId createdAt").sort("-createdAt").limit(60),
      Quiz.find({ courseId: { $in: ids }, kind: { $ne: "retest" } }).select("title courseId kind createdAt updatedAt testDate").sort("-createdAt").limit(60),
      Note.find({ courseId: { $in: ids } }).select("title courseId createdBy createdAt").populate("createdBy", "name").sort("-createdAt").limit(60),
      Module.find({ courseId: { $in: ids }, status: "this_week" }).select("title courseId order").sort("order"),
    ]);
    const count = (list) => Object.fromEntries(list.map((x) => [String(x._id), x.n]));
    // ✅/⚠️ Is hafte kis subject mein kaam diya gaya
    const ws = weekStart();
    const week = {};
    const bump = (cid, k) => { const id = String(cid); week[id] = week[id] || { homework: 0, quizzes: 0 }; week[id][k]++; };
    asg.filter((a) => new Date(a.createdAt) >= ws).forEach((a) => bump(a.courseId, "homework"));
    quizzes.filter((q) => new Date(q.createdAt) >= ws).forEach((q) => bump(q.courseId, "quizzes"));
    // ⚖️ Plan ke liye: is hafte asal quiz (revision nahi) aur homework
    const we = new Date(ws.getTime() + 7 * DAY_MS);
    const planDone = {};
    const mark = (cid, k) => { const id = String(cid); planDone[id] = planDone[id] || { homework: 0, quizzes: 0 }; planDone[id][k]++; };
    asg.filter((a) => new Date(a.createdAt) >= ws).forEach((a) => mark(a.courseId, "homework"));
    quizzes.filter((q) => q.kind !== "revision" && (new Date(q.createdAt) >= ws || (q.testDate && new Date(q.testDate) >= ws && new Date(q.testDate) < we)))
      .forEach((q) => mark(q.courseId, "quizzes"));
    const topicsOf = {};
    nowTopics.forEach((m) => { const id = String(m.courseId); (topicsOf[id] = topicsOf[id] || []).push(m.title); });
    const students = count(enrolls);
    const needHelp = count(helps);
    const warn = {};
    warnings.forEach((w) => { warn[String(w.courseId)] = (warn[String(w.courseId)] || 0) + 1; });
    const teacherOf = (cid) => courseInfo[String(cid)]?.instructorId?.name || "Teacher";
    const titleOf = (cid) => courseInfo[String(cid)]?.title || "Subject";

    const updates = [
      ...asg.map((a) => ({ icon: "📝", text: teacherOf(a.courseId) + " gave homework: " + a.title, courseId: a.courseId, at: a.createdAt })),
      ...quizzes.map((q) => ({ icon: q.kind === "revision" ? "📋" : "🧠", text: teacherOf(q.courseId) + (q.kind === "revision" ? " made a revision test: " : " made a quiz: ") + q.title, courseId: q.courseId, at: q.createdAt })),
      // 📅 Purane quiz par nayi test date lagi → wo bhi "Latest" mein
      ...quizzes.filter((q) => q.testDate && q.updatedAt && new Date(q.updatedAt) - new Date(q.createdAt) > 60 * 1000)
        .map((q) => ({ icon: "📅", text: teacherOf(q.courseId) + " set a test date: " + q.title + " (" + new Date(q.testDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ")", courseId: q.courseId, at: q.updatedAt })),
      ...notes.map((n) => ({ icon: "📄", text: (n.createdBy?.name || teacherOf(n.courseId)) + " sent notes: " + n.title, courseId: n.courseId, at: n.createdAt })),
    ];

    const out = classes.map((k) => {
      const mine = new Set(k.courseIds.map(String));
      const subjects = k.courseIds.filter((cid) => courseInfo[String(cid)]).map((cid) => {
        const c = courseInfo[String(cid)];
        return {
          _id: c._id, title: c.title, teacher: c.instructorId?.name || "No teacher", status: c.status,
          students: students[String(cid)] || 0, needHelp: needHelp[String(cid)] || 0, warnings: warn[String(cid)] || 0,
          thisWeek: week[String(cid)] || { homework: 0, quizzes: 0 },
        };
      });
      // ⚖️ Assessment Planner: is hafte kis ki baari
      const per = Math.min(k.testsPerWeek || 2, subjects.length || 1);
      const rounds = subjects.length ? Math.ceil(subjects.length / per) : 0;
      const startWeek = weekStart(k.planStart || k.createdAt || new Date());
      const weekNo = Math.max(0, Math.round((ws - startWeek) / (7 * DAY_MS)));
      const slot = rounds ? weekNo % rounds : 0;
      const pick = (sl) => rotation(subjects.length, per, sl).map((i) => subjects[i]);
      const thisWeekPlan = rounds ? pick(slot).map((s) => {
        const d = planDone[String(s._id)] || { homework: 0, quizzes: 0 };
        return {
          courseId: s._id, title: s.title, teacher: s.teacher, teacherId: courseInfo[String(s._id)]?.instructorId?._id || null,
          quiz: d.quizzes, homework: d.homework, done: d.quizzes > 0 && d.homework > 0,
          topics: topicsOf[String(s._id)] || [],
        };
      }) : [];
      const plan = {
        week: rounds ? slot + 1 : 0, rounds, perWeek: per,
        from: ws, to: new Date(we.getTime() - DAY_MS),
        thisWeek: thisWeekPlan,
        nextWeek: rounds ? pick((slot + 1) % rounds).map((s) => ({ title: s.title, teacher: s.teacher })) : [],
        cycle: Array.from({ length: rounds }, (_, r) => pick(r).map((s) => s.title)),
        done: thisWeekPlan.filter((x) => x.done).length,
      };
      return {
        _id: k._id,
        name: k.name,
        testsPerWeek: k.testsPerWeek || 2,
        plan,
        classTeacher: k.classTeacherId ? { _id: k.classTeacherId._id, name: k.classTeacherId.name } : null,
        courseIds: k.courseIds,
        subjects,
        totals: {
          students: Math.max(0, ...subjects.map((s) => s.students)),
          needHelp: subjects.reduce((s, x) => s + x.needHelp, 0),
          warnings: subjects.reduce((s, x) => s + x.warnings, 0),
          quietThisWeek: subjects.filter((x) => !x.thisWeek.homework && !x.thisWeek.quizzes).length,
          planDone: plan.done,
          planTotal: plan.thisWeek.length,
        },
        timetable: k.timetable
          .filter((t) => courseInfo[String(t.courseId)])
          .map((t) => ({ day: t.day, time: t.time, courseId: t.courseId, subject: titleOf(t.courseId), teacher: teacherOf(t.courseId) }))
          .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.time.localeCompare(b.time)),
        updates: updates
          .filter((u) => mine.has(String(u.courseId)))
          .sort((a, b) => new Date(b.at) - new Date(a.at))
          .slice(0, 6)
          .map((u) => ({ ...u, subject: titleOf(u.courseId) })),
      };
    });

    await sendTurnAlerts(org, out, ws);

    const used = new Set(classes.flatMap((k) => k.courseIds.map(String)));
    return {
      classes: out,
      teachers,
      courses: courses.map((c) => ({ _id: c._id, title: c.title, teacher: c.instructorId?.name || "", inClass: used.has(String(c._id)) })),
    };
};

// GET /api/classes → 🌳 poora tree (principal)
const listClasses = async (req, res) => {
  try {
    res.json(await buildTree(req.user.organizationId));
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/classes/mine → 👩‍🏫 teacher: meri class (agar class teacher hoon) + mera timetable
const myClasses = async (req, res) => {
  try {
    const org = req.user.organizationId;
    const me = req.user.userId;
    const tree = await buildTree(org, { classTeacherId: me });

    // 🗓️ Mera timetable: har class mein mere subjects ke periods
    const myCourses = await Course.find({ organizationId: org, instructorId: me }).select("title");
    const mine = new Set(myCourses.map((c) => String(c._id)));
    const titleOf = Object.fromEntries(myCourses.map((c) => [String(c._id), c.title]));
    const all = await SchoolClass.find({ organizationId: org, "timetable.courseId": { $in: myCourses.map((c) => c._id) } }).select("name timetable");
    const periods = [];
    all.forEach((k) => k.timetable.forEach((t) => {
      if (mine.has(String(t.courseId))) periods.push({ day: t.day, time: t.time, subject: titleOf[String(t.courseId)], className: k.name });
    }));
    periods.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.time.localeCompare(b.time));

    res.json({ classes: tree.classes, timetable: periods });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/classes/turns → 👩‍🏫 subject teacher: "is hafte meri baari" (har class mein)
const myTurns = async (req, res) => {
  try {
    const tree = await buildTree(req.user.organizationId);
    const me = String(req.user.userId);
    const turns = [];
    tree.classes.forEach((k) => k.plan.thisWeek.forEach((p) => {
      if (String(p.teacherId) === me) turns.push({ ...p, className: k.name, week: k.plan.week, rounds: k.plan.rounds });
    }));
    res.json({ turns });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/classes
const createClass = async (req, res) => {
  try {
    const data = await cleanBody(req);
    if (!data.name) return res.status(400).json({ message: "Name is required" });
    const k = await SchoolClass.create({ organizationId: req.user.organizationId, ...data });
    res.status(201).json({ message: "Created ✅", class: k });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/classes/:id
const updateClass = async (req, res) => {
  try {
    const data = await cleanBody(req);
    const k = await SchoolClass.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId }, data, { new: true });
    if (!k) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Saved ✅", class: k });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE /api/classes/:id (courses waise hi rehte hain)
const deleteClass = async (req, res) => {
  try {
    const k = await SchoolClass.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!k) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted. The subjects themselves are not touched." });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { listClasses, myClasses, myTurns, createClass, updateClass, deleteClass };