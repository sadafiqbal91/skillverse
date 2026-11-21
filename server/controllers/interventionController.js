const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const Intervention = require("../models/Intervention");
const Note = require("../models/Note");
const Enrollment = require("../models/Enrollment");
const { notify, parentsOf, MAX_RETESTS } = require("../services/interventionService");

const ACTIVE = ["needs_practice", "intervention", "one_on_one"];
const PER_RETEST = 3;

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  res.status(500).json({ message: error.message });
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const roundInfo = (iv) => {
  const taken = iv.retestsTaken || 0;
  return { round: Math.min(taken + 1, MAX_RETESTS), maxRounds: MAX_RETESTS, retestsLeft: Math.max(MAX_RETESTS - taken, 0) };
};

const ownCourse = (courseId, req) =>
  Course.findOne({ _id: courseId, organizationId: req.user.organizationId, instructorId: req.user.userId });

// GET /api/interventions/me
const myInterventions = async (req, res) => {
  try {
    const items = await Intervention.find({
      organizationId: req.user.organizationId, studentId: req.user.userId, level: { $in: ACTIVE },
    })
      .populate("courseId", "title")
      .select("courseId topic level latestPercent notesSent retestsTaken updatedAt");
    res.json({ count: items.length, interventions: items.map((iv) => ({ ...iv.toObject(), ...roundInfo(iv) })) });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/interventions/:id/retest
const startRetest = async (req, res) => {
  try {
    const iv = await Intervention.findOne({
      _id: req.params.id, organizationId: req.user.organizationId, studentId: req.user.userId, level: { $in: ACTIVE },
    });
    if (!iv) return res.status(404).json({ message: "This practice item was not found or is already resolved" });
    if (iv.level === "one_on_one" || (iv.retestsTaken || 0) >= MAX_RETESTS) {
      return res.status(400).json({ message: `You've used all ${MAX_RETESTS} re-tests for ${iv.topic}. Your teacher will help you 1-on-1 🙋` });
    }
    if (iv.level === "intervention" && !iv.notesSent) {
      return res.status(400).json({ message: "Please wait for your teacher's notes before the next re-test 📄" });
    }

    let attempt = await Attempt.findOne({
      interventionId: iv._id, studentId: req.user.userId, status: "in_progress", expiresAt: { $gt: new Date() },
    });

    if (!attempt) {
      const quizzes = await Quiz.find({ courseId: iv.courseId }).select("_id");
      const bank = await Question.find({ quizId: { $in: quizzes.map((q) => q._id) }, topic: iv.topic }).select("_id");
      if (bank.length === 0) return res.status(400).json({ message: "No questions found for this topic" });

      const retestSeen = new Set((iv.seenQuestionIds || []).map(String));
      const regular = await Attempt.find({ studentId: req.user.userId, courseId: iv.courseId, kind: "regular" }).select("questionIds");
      const regularSeen = new Set(regular.flatMap((a) => a.questionIds.map(String)));
      const rank = (q) => (retestSeen.has(String(q._id)) ? 2 : regularSeen.has(String(q._id)) ? 1 : 0);

      const ordered = shuffle(bank).sort((a, b) => rank(a) - rank(b));
      const fresh = ordered.filter((q) => rank(q) < 2);

      if (fresh.length === 0) {
        const last = iv.history[iv.history.length - 1];
        if (last?.event !== "questions_needed") {
          iv.history.push({ event: "questions_needed", percent: iv.latestPercent });
          await iv.save();
          const course = await Course.findById(iv.courseId).select("instructorId");
          await notify(req.user.organizationId, [course.instructorId], {
            type: "questions_needed",
            title: `➕ ${iv.topic}: add more questions`,
            message: `A student needs a new re-test on ${iv.topic}, but all questions have been used. Please add a few more.`,
            meta: { courseId: iv.courseId, topic: iv.topic },
          });
        }
        return res.status(400).json({ message: `Your teacher is adding new ${iv.topic} questions for you. Please check back soon 🙏` });
      }

      const picked = fresh.slice(0, PER_RETEST);
      iv.seenQuestionIds.push(...picked.map((q) => q._id));
      await iv.save();

      attempt = await Attempt.create({
        organizationId: req.user.organizationId, courseId: iv.courseId, studentId: req.user.userId,
        kind: "retest", interventionId: iv._id,
        questionIds: picked.map((q) => q._id), total: picked.length,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
    }

    const { round, maxRounds } = roundInfo(iv);
    const questions = await Question.find({ _id: { $in: attempt.questionIds } }).select("text options topic");
    res.status(201).json({
      attemptId: attempt._id, kind: "retest",
      title: `Re-test ${round} of ${maxRounds}: ${iv.topic}`, topic: iv.topic, round, maxRounds,
      expiresAt: attempt.expiresAt, questions: shuffle(questions),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/interventions?courseId=... → weak topics + course topics + enrolled students
const listForCourse = async (req, res) => {
  try {
    const { courseId } = req.query;
    const course = await ownCourse(courseId, req);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const [items, ens] = await Promise.all([
      Intervention.find({ courseId, level: { $in: ACTIVE } }).populate("studentId", "name"),
      Enrollment.find({ courseId }).populate("studentId", "name"),
    ]);
    const groups = {};
    for (const iv of items) {
      groups[iv.topic] = groups[iv.topic] || { topic: iv.topic, needs_practice: [], intervention: [], one_on_one: [] };
      groups[iv.topic][iv.level].push({
        name: iv.studentId?.name, percent: iv.latestPercent, notesSent: iv.notesSent,
        retestsTaken: iv.retestsTaken || 0, maxRounds: MAX_RETESTS,
      });
    }
    res.json({
      course: course.title,
      topics: Object.values(groups),
      courseTopics: course.topics,
      students: ens.filter((e) => e.studentId).map((e) => ({ _id: e.studentId._id, name: e.studentId.name })),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/interventions/notes → teacher. audience: "weak" | "class" | "selected" (+ studentIds)
const sendNotes = async (req, res) => {
  try {
    const { courseId, topic, title, text, fileUrl, audience = "weak", studentIds: chosen = [] } = req.body;
    if (!courseId || !topic || !title) return res.status(400).json({ message: "Course, topic and title are required" });

    const course = await ownCourse(courseId, req);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const weak = await Intervention.find({ courseId, topic, level: { $in: ["intervention", "one_on_one"] } });

    let studentIds;
    if (audience === "class") {
      const ens = await Enrollment.find({ courseId }).select("studentId");
      studentIds = ens.map((e) => e.studentId);
      if (!studentIds.length) return res.status(400).json({ message: "No students are enrolled in this course yet" });
    } else if (audience === "selected") {
      if (!Array.isArray(chosen) || !chosen.length) return res.status(400).json({ message: "Please choose at least one student" });
      const ens = await Enrollment.find({ courseId, studentId: { $in: chosen } }).select("studentId");
      studentIds = ens.map((e) => e.studentId);
      if (!studentIds.length) return res.status(400).json({ message: "These students are not in this course" });
    } else {
      if (!weak.length) return res.status(400).json({ message: "No student needs notes for this topic right now" });
      studentIds = weak.map((t) => t.studentId);
    }

    const note = await Note.create({
      organizationId: req.user.organizationId, courseId, topic, title, text, fileUrl,
      createdBy: req.user.userId, recipients: studentIds, audience,
    });

    // Weak students who received the notes unlock their next re-test
    const receiving = new Set(studentIds.map(String));
    for (const iv of weak) {
      if (!receiving.has(String(iv.studentId))) continue;
      iv.notesSent = true;
      iv.history.push({ event: "notes_sent", percent: iv.latestPercent });
      await iv.save();
    }

    const parentIds = (await Promise.all(studentIds.map((id) => parentsOf(id)))).flat();
    const message = {
      class: `Your teacher shared notes on ${topic} with the whole class.`,
      selected: `Your teacher sent you notes on ${topic}.`,
      weak: `Notes for ${topic} have arrived. Read them, then take the re-test.`,
    }[audience] || `New notes on ${topic}.`;
    await notify(req.user.organizationId, [...studentIds, ...parentIds], {
      type: "notes_received", title: `📄 New notes: ${title}`, message, meta: { courseId, topic },
    });

    res.status(201).json({ message: `Notes sent to ${studentIds.length} student(s) and their parents 📄`, noteId: note._id });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/interventions/notes/sent?courseId=... → teacher: history of notes sent
const sentNotes = async (req, res) => {
  try {
    const { courseId } = req.query;
    const course = await ownCourse(courseId, req);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const notes = await Note.find({ courseId, createdBy: req.user.userId })
      .populate("recipients", "name")
      .sort("-createdAt")
      .limit(30);
    res.json({
      notes: notes.map((n) => ({
        _id: n._id, title: n.title, topic: n.topic, audience: n.audience || "weak", createdAt: n.createdAt,
        count: n.recipients.length, names: n.recipients.map((r) => r.name),
      })),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/interventions/notes/me
const myNotes = async (req, res) => {
  try {
    const notes = await Note.find({ organizationId: req.user.organizationId, recipients: req.user.userId })
      .populate("courseId", "title")
      .populate("createdBy", "name")
      .select("-recipients")
      .sort("-createdAt");
    res.json({ count: notes.length, notes });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { myInterventions, startRetest, listForCourse, sendNotes, sentNotes, myNotes };