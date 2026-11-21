const ChatMessage = require("../models/ChatMessage");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Organization = require("../models/Organization");
const { notify } = require("../services/interventionService");
const { askJSON } = require("../services/aiService");

const MAX_QUESTIONS_PER_HOUR = 10; // AI ka ghalat istemal na ho

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  res.status(500).json({ message: error.message });
};

// 🚪 Kaun is room mein aa sakta hai: enrolled student, course ka teacher, principal (sirf parh sakta hai)
const roomAccess = async (req, courseId) => {
  const course = await Course.findOne({ _id: courseId, organizationId: req.user.organizationId }).select("title instructorId topics");
  if (!course) return null;
  const { role, userId } = req.user;
  if (role === "orgadmin") return { course, canModerate: false, canPost: false };
  if (role === "instructor") return String(course.instructorId) === String(userId) ? { course, canModerate: true, canPost: true } : null;
  if (role === "student") {
    const ok = await Enrollment.exists({ courseId: course._id, studentId: userId });
    return ok ? { course, canModerate: false, canPost: true } : null;
  }
  return null;
};

// 🤖 AI ka jawab (chhota, simple, test ka seedha jawab nahi)
const aiAnswer = async (course, orgType, question) => {
  const young = orgType === "school";
  const prompt = [
    'You are a kind teaching assistant for the course "' + course.title + '".',
    "Course topics: " + ((course.topics || []).join(", ") || "general") + ".",
    young ? "The student is a school child. Use very simple words and one small example." : "Use clear, simple English.",
    "Answer in at most 100 words.",
    "If the question is not about studies, politely say you can only help with this course.",
    "Do not just give answers to homework or tests. Explain the idea so the student can solve it.",
    'Return only JSON: {"answer":"..."}',
    "Student question: " + question,
  ].join("\n");
  const out = await askJSON([{ text: prompt }]);
  return String((out && out.answer) || "").trim().slice(0, 1500);
};

// GET /api/chat/rooms → mere rooms + kitne sawal teacher ke check ke intezar mein
const myRooms = async (req, res) => {
  try {
    const { role, userId, organizationId } = req.user;
    let courses = [];
    if (role === "instructor") courses = await Course.find({ organizationId, instructorId: userId }).select("title");
    else if (role === "orgadmin") courses = await Course.find({ organizationId }).select("title");
    else if (role === "student") {
      const ens = await Enrollment.find({ studentId: userId }).populate("courseId", "title");
      courses = ens.map((e) => e.courseId).filter(Boolean);
    }
    const ids = courses.map((c) => c._id);

    const [pending, last] = await Promise.all([
      ChatMessage.aggregate([
        { $match: { courseId: { $in: ids }, kind: "question", answered: false } },
        { $group: { _id: "$courseId", n: { $sum: 1 } } },
      ]),
      ChatMessage.aggregate([
        { $match: { courseId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$courseId", text: { $first: "$text" }, name: { $first: "$name" }, at: { $first: "$createdAt" } } },
      ]),
    ]);
    const pMap = Object.fromEntries(pending.map((p) => [String(p._id), p.n]));
    const lMap = Object.fromEntries(last.map((l) => [String(l._id), l]));

    res.json({
      rooms: courses.map((c) => ({ _id: c._id, title: c.title, pending: pMap[String(c._id)] || 0, last: lMap[String(c._id)] || null })),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/chat/course/:courseId → room ke messages (aakhri 150)
const roomMessages = async (req, res) => {
  try {
    const acc = await roomAccess(req, req.params.courseId);
    if (!acc) return res.status(403).json({ message: "You are not in this class" });
    const list = await ChatMessage.find({ courseId: acc.course._id }).sort("-createdAt").limit(150).lean();
    const me = String(req.user.userId);
    res.json({
      course: { _id: acc.course._id, title: acc.course.title },
      canModerate: acc.canModerate,
      canPost: acc.canPost,
      messages: list.reverse().map((m) => ({ ...m, mine: m.userId ? String(m.userId) === me : false })),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/chat/course/:courseId → message bhejo. { text, ask } ask = ❓ teacher se poocho
const postMessage = async (req, res) => {
  try {
    const acc = await roomAccess(req, req.params.courseId);
    if (!acc) return res.status(403).json({ message: "You are not in this class" });
    if (!acc.canPost) return res.status(403).json({ message: "You can read this chat, but not post" });

    const text = String(req.body.text || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ message: "Write a message first" });

    const { userId, organizationId, role } = req.user;
    const ask = role === "student" && Boolean(req.body.ask);

    if (ask) {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const n = await ChatMessage.countDocuments({ userId, kind: "question", createdAt: { $gte: since } });
      if (n >= MAX_QUESTIONS_PER_HOUR) {
        return res.status(429).json({ message: "You asked " + MAX_QUESTIONS_PER_HOUR + " questions this hour. Please try again later 🙏" });
      }
    }

    const me = await User.findById(userId).select("name");
    const msg = await ChatMessage.create({
      organizationId, courseId: acc.course._id, userId, name: (me && me.name) || "User", role,
      text, kind: ask ? "question" : "chat", answered: ask ? false : undefined,
    });
    if (!ask) return res.status(201).json({ message: msg });

    // 🤖 AI foran jawab de, teacher baad mein check kare
    let ai = null;
    try {
      const org = await Organization.findById(organizationId).select("type");
      const answer = await aiAnswer(acc.course, org && org.type, text);
      if (answer) {
        ai = await ChatMessage.create({
          organizationId, courseId: acc.course._id, name: "AI Helper", role: "ai",
          text: answer, kind: "ai", replyTo: msg._id, review: "pending",
        });
      }
    } catch (e) {
      ai = null; // AI busy: teacher khud jawab dega
    }

    await notify(organizationId, [acc.course.instructorId], {
      type: "ask_teacher",
      title: "❓ " + msg.name + " asked in " + acc.course.title,
      message: text.slice(0, 120) + (ai ? " · AI answered, please check it" : " · please answer"),
      meta: { courseId: acc.course._id },
    });

    res.status(201).json({ message: msg, ai, note: ai ? "" : "AI is busy, your teacher will answer soon." });
  } catch (error) {
    handleError(res, error);
  }
};

// Teacher ke liye: sawal dhoondo + check karo ke ye usi ka course hai
const teacherQuestion = async (req) => {
  const q = await ChatMessage.findOne({ _id: req.params.id, organizationId: req.user.organizationId, kind: "question" });
  if (!q) return { error: [404, "Question not found"] };
  const acc = await roomAccess(req, q.courseId);
  if (!acc || !acc.canModerate) return { error: [403, "This is not your class"] };
  return { q, acc };
};

// PATCH /api/chat/:id/approve → ✅ AI ka jawab theek hai
const approveAI = async (req, res) => {
  try {
    const { q, acc, error } = await teacherQuestion(req);
    if (error) return res.status(error[0]).json({ message: error[1] });
    const ai = await ChatMessage.findOne({ replyTo: q._id, kind: "ai" });
    if (!ai) return res.status(400).json({ message: "There is no AI answer. Please write your answer." });

    ai.review = "approved";
    await ai.save();
    q.answered = true;
    await q.save();

    await notify(req.user.organizationId, [q.userId], {
      type: "teacher_answer",
      title: "✅ " + acc.course.title + ": your teacher checked the answer",
      message: q.text.slice(0, 120),
      meta: { courseId: q.courseId },
    });
    res.json({ message: "Approved ✅" });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/chat/:id/answer → 👩‍🏫 teacher ka apna jawab (AI ko theek karna ya AI busy tha)
const teacherAnswer = async (req, res) => {
  try {
    const { q, acc, error } = await teacherQuestion(req);
    if (error) return res.status(error[0]).json({ message: error[1] });
    const text = String(req.body.text || "").trim().slice(0, 1500);
    if (!text) return res.status(400).json({ message: "Write your answer first" });

    const me = await User.findById(req.user.userId).select("name");
    await ChatMessage.create({
      organizationId: req.user.organizationId, courseId: q.courseId, userId: req.user.userId,
      name: (me && me.name) || "Teacher", role: "instructor", text, kind: "teacher", replyTo: q._id,
    });
    await ChatMessage.updateMany({ replyTo: q._id, kind: "ai" }, { review: "corrected" });
    q.answered = true;
    await q.save();

    await notify(req.user.organizationId, [q.userId], {
      type: "teacher_answer",
      title: "👩‍🏫 " + acc.course.title + ": your teacher answered",
      message: text.slice(0, 120),
      meta: { courseId: q.courseId },
    });
    res.status(201).json({ message: "Answer sent ✅" });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE /api/chat/:id → apna message, ya teacher koi bhi (saath uske jawab bhi)
const removeMessage = async (req, res) => {
  try {
    const m = await ChatMessage.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!m) return res.status(404).json({ message: "Message not found" });
    const acc = await roomAccess(req, m.courseId);
    const mine = m.userId && String(m.userId) === String(req.user.userId);
    if (!acc || (!mine && !acc.canModerate)) return res.status(403).json({ message: "You can't delete this message" });
    await ChatMessage.deleteMany({ $or: [{ _id: m._id }, { replyTo: m._id }] });
    res.json({ message: "Deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { myRooms, roomMessages, postMessage, approveAI, teacherAnswer, removeMessage };