const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Intervention = require("../models/Intervention");
const Enrollment = require("../models/Enrollment");
const { notify, parentsOf } = require("../services/interventionService");
const { askJSON } = require("../services/aiService");
const { alertClassTeacher } = require("../services/classAlertService");

const MIN_PER_TOPIC = 3; // is se kam sawal hon to AI madad karega

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  res.status(500).json({ message: error.message });
};

// Sirf apna course (teacher)
const myCourse = (req) =>
  Course.findOne({ _id: req.params.courseId, organizationId: req.user.organizationId, instructorId: req.user.userId }).select("title");

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const isStar = (q) => Boolean(q && (q.important || q.isImportant || q.starred));
const plain = (q) => (q && typeof q.toObject === "function" ? q.toObject() : q);

// Ek jaisa sawal do quizzes mein ho to ek hi gino
const uniqueByText = (list) => {
  const seen = new Set();
  return list.filter((q) => {
    const k = String(q.text || "").trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// Course ke normal quizzes ka question bank (revision quizzes ko chhor kar)
const bankFor = async (courseId, topics, withAnswer = false) => {
  const quizzes = await Quiz.find({ courseId, kind: { $ne: "revision" } }).select("_id");
  const filter = { quizId: { $in: quizzes.map((q) => q._id) } };
  if (topics) filter.topic = { $in: topics };
  const q = Question.find(filter);
  if (withAnswer) q.select("+correctIndex");
  return uniqueByText(await q);
};

// ✨ AI: kam sawal wale topics ke liye naye MCQs
const aiQuestions = async (courseTitle, topics, perTopic) => {
  const prompt = [
    "You are a teacher making an exam revision test.",
    "Course: " + courseTitle + ".",
    "Write exactly " + perTopic + " multiple-choice questions for EACH of these topics: " + topics.join(", ") + ".",
    "Use simple English suitable for the students of this course. Each question has 3 or 4 short options and exactly one correct answer.",
    'Return only JSON like: {"questions":[{"topic":"<one of the topics exactly>","text":"...","options":["...","...","..."],"correctIndex":0}]}',
  ].join("\n");

  const out = await askJSON([{ text: prompt }]);
  const list = Array.isArray(out) ? out : (out && out.questions) || [];
  return list
    .filter((q) =>
      q && topics.includes(q.topic) && typeof q.text === "string" && q.text.trim() &&
      Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 5 &&
      Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length)
    .map((q) => ({ topic: q.topic, text: q.text.trim(), options: q.options.map((o) => String(o).trim()), correctIndex: q.correctIndex, aiMade: true }));
};

// ⚖️ Har topic se sawal (bara syllabus bhi balance rahe). Kamzor topics ko har round mein 2 sawal.
const balancedPick = (pool, n, weakSet) => {
  const groups = {};
  pool.forEach((q) => { (groups[q.topic] ||= []).push(q); });
  // ⭐ Important sawal har topic mein sab se pehle, baqi random
  Object.keys(groups).forEach((t) => {
    const g = shuffle(groups[t]);
    groups[t] = [...g.filter(isStar), ...g.filter((q) => !isStar(q))];
  });
  const order = [...shuffle(Object.keys(groups).filter((t) => weakSet.has(t))), ...shuffle(Object.keys(groups).filter((t) => !weakSet.has(t)))];

  const picked = [];
  while (picked.length < n) {
    let added = 0;
    for (const t of order) {
      const take = weakSet.has(t) ? 2 : 1;
      for (let i = 0; i < take && groups[t].length && picked.length < n; i++) {
        picked.push(groups[t].shift());
        added++;
      }
    }
    if (!added) break;
  }
  return picked;
};

// GET /api/quizzes/revision/plan/:courseId → chapters, topics, sawal kitne, kamzor bachay kitne
const revisionPlan = async (req, res) => {
  try {
    const course = await myCourse(req);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const [mods, lessons, ivs, bank] = await Promise.all([
      Module.find({ courseId: course._id }).sort("order").select("title status order term"),
      Lesson.find({ courseId: course._id }).select("moduleId topics"),
      Intervention.find({ courseId: course._id, level: { $ne: "resolved" } }).select("topic studentId"),
      bankFor(course._id),
    ]);

    const perTopic = {};
    bank.forEach((q) => { perTopic[q.topic] = (perTopic[q.topic] || 0) + 1; });
    const weak = {};
    ivs.forEach((iv) => { (weak[iv.topic] ||= new Set()).add(String(iv.studentId)); });

    const chapters = mods.map((m) => {
      const topics = [...new Set(lessons.filter((l) => l.moduleId && l.moduleId.equals(m._id)).flatMap((l) => l.topics || []))];
      return {
        _id: m._id, title: m.title, status: m.status || "upcoming", term: m.term || null,
        topics: topics.map((t) => ({ topic: t, questions: perTopic[t] || 0, weakStudents: weak[t] ? weak[t].size : 0 })),
      };
    });

    res.json({ course, chapters, minPerTopic: MIN_PER_TOPIC });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/quizzes/revision/:courseId → 📝 revision test banao
const createRevision = async (req, res) => {
  try {
    const course = await myCourse(req);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const { moduleIds = [], title, count = 10, minutes = 20, testDate, useAI = false } = req.body;
    if (!moduleIds.length) return res.status(400).json({ message: "Pick at least one chapter" });

    const mods = await Module.find({ _id: { $in: moduleIds }, courseId: course._id }).sort("order").select("title");
    const lessons = await Lesson.find({ courseId: course._id, moduleId: { $in: mods.map((m) => m._id) } }).select("topics");
    const topics = [...new Set(lessons.flatMap((l) => l.topics || []))];
    if (!topics.length) return res.status(400).json({ message: "These chapters have no lesson topics yet" });

    let pool = (await bankFor(course._id, topics, true)).map(plain);

    // ✨ AI: jin topics mein kam sawal hain un ke liye naye sawal
    let aiAdded = 0;
    let aiNote = "";
    if (useAI) {
      const perTopic = {};
      pool.forEach((q) => { perTopic[q.topic] = (perTopic[q.topic] || 0) + 1; });
      const thin = topics.filter((t) => (perTopic[t] || 0) < MIN_PER_TOPIC).slice(0, 10);
      if (thin.length) {
        try {
          const made = await aiQuestions(course.title, thin, MIN_PER_TOPIC);
          pool = uniqueByText([...pool, ...made]);
          aiAdded = made.length;
        } catch (e) {
          aiNote = "AI is busy right now, so the test uses the question bank only.";
        }
      }
    }

    if (!pool.length) {
      return res.status(400).json({ message: aiNote || "No quiz questions found for these chapters. Tick ✨ AI, or add a quiz with questions first." });
    }

    const ivs = await Intervention.find({ courseId: course._id, topic: { $in: topics }, level: { $ne: "resolved" } }).select("topic");
    const weakSet = new Set(ivs.map((i) => i.topic));

    const n = Math.min(Math.max(Number(count) || 10, 3), pool.length);
    const picked = balancedPick(pool, n, weakSet);
    const weakQuestions = picked.filter((q) => weakSet.has(q.topic)).length;
    const aiUsed = picked.filter((q) => q.aiMade).length;
    const starred = picked.filter(isStar).length;

    const name = String(title || "").trim() || mods.map((m) => m.title).join(" + ");
    const quiz = await Quiz.create({
      organizationId: req.user.organizationId,
      courseId: course._id,
      title: ("📝 Revision: " + name).slice(0, 140),
      kind: "revision",
      chapterIds: mods.map((m) => m._id),
      timeLimitMinutes: Math.min(Math.max(Number(minutes) || 20, 5), 120),
      questionsPerAttempt: picked.length,
      testDate: testDate ? new Date(testDate) : undefined,
    });

    await Question.insertMany(picked.map((q) => {
      const o = { ...q };
      delete o._id; delete o.createdAt; delete o.updatedAt; delete o.__v; delete o.aiMade;
      return { ...o, organizationId: req.user.organizationId, quizId: quiz._id };
    }));

    // 🔔 Students + parents ko batao
    const ens = await Enrollment.find({ courseId: course._id }).select("studentId");
    const students = ens.map((e) => e.studentId);
    const parents = (await Promise.all(students.map((id) => parentsOf(id)))).flat();
    const when = quiz.testDate ? " on " + quiz.testDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
    await notify(req.user.organizationId, [...students, ...parents], {
      type: "revision_test",
      title: "📝 Revision test" + when + ": " + course.title,
      message: name + ". " + picked.length + " questions, " + quiz.timeLimitMinutes + " min. Marks count in the report card. Revise your weak topics first!",
      meta: { courseId: course._id, quizId: quiz._id },
    });

    await alertClassTeacher(req.user.organizationId, course._id, req.user.userId, "made a revision test: " + name + when);

    res.status(201).json({
      message: "Revision test created with " + picked.length + " questions 📝",
      note: aiNote,
      quiz: { _id: quiz._id, title: quiz.title, questions: picked.length, weakQuestions, starred, aiQuestions: aiUsed, aiAdded, topics: new Set(picked.map((q) => q.topic)).size },
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { revisionPlan, createRevision };