const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const User = require("../models/User");
const { notify } = require("../services/interventionService");

const STATUSES = ["upcoming", "this_week", "covered"];
const TERMS = [1, 2, 3];
// "1" / 1 → 1, "" / null / 0 → null (term hatao)
const toTerm = (v) => (v === undefined || v === null || v === "" || v === 0 || v === "0" ? null : Number(v));

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: error.message });
};

const findOwnCourse = (courseId, req) =>
  Course.findOne({ _id: courseId, organizationId: req.user.organizationId, instructorId: req.user.userId });

// POST /api/courses → instructor
const createCourse = async (req, res) => {
  try {
    const { title, description, topics } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    const course = await Course.create({
      organizationId: req.user.organizationId, instructorId: req.user.userId, title, description, topics,
    });
    res.status(201).json({ message: "Course created ✅ (draft)", course });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/courses → everyone (students also get "enrolled" + progress)
const listCourses = async (req, res) => {
  try {
    const { userId, role, organizationId } = req.user;
    const filter = { organizationId };
    if (role === "student") filter.status = "published";
    if (role === "instructor") {
      if (req.query.mine === "true") filter.instructorId = userId;
      else filter.$or = [{ status: "published" }, { instructorId: userId }];
    }

    const courses = await Course.find(filter)
      .populate("instructorId", "name")
      .select("title description topics status instructorId createdAt")
      .sort("-createdAt")
      .lean();
    const ids = courses.map((c) => c._id);

    const [counts, students] = await Promise.all([
      Lesson.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]),
      Enrollment.aggregate([{ $match: { courseId: { $in: ids } } }, { $group: { _id: "$courseId", n: { $sum: 1 } } }]),
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    const studentMap = Object.fromEntries(students.map((c) => [String(c._id), c.n]));

    let enrollMap = {};
    if (role === "student") {
      const ens = await Enrollment.find({ studentId: userId, courseId: { $in: ids } }).select("courseId progressPercent status").lean();
      enrollMap = Object.fromEntries(ens.map((e) => [String(e.courseId), e]));
    }

    const result = courses.map((c) => {
      const e = enrollMap[String(c._id)];
      return {
        ...c,
        lessonCount: countMap[String(c._id)] || 0,
        studentCount: role === "student" ? undefined : studentMap[String(c._id)] || 0,
        enrolled: Boolean(e),
        progressPercent: e?.progressPercent || 0,
        enrollmentStatus: e?.status || null,
      };
    });
    res.json({ count: result.length, courses: result });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/courses/:id → outline (lesson CONTENT hidden), quizzes, my enrollment
const getCourse = async (req, res) => {
  try {
    const { userId, role, organizationId } = req.user;
    const course = await Course.findOne({ _id: req.params.id, organizationId }).populate("instructorId", "name");
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (role === "student" && course.status !== "published") return res.status(404).json({ message: "Course not found" });

    const [modules, lessons, quizzes] = await Promise.all([
      Module.find({ courseId: course._id }).sort("order"),
      Lesson.find({ courseId: course._id }).select("title moduleId topics durationMinutes order videoUrl createdAt").sort("order"),
      Quiz.find({ courseId: course._id }).select("title timeLimitMinutes questionsPerAttempt testDate"),
    ]);

    let enrollment = null;
    if (role === "student") {
      enrollment = await Enrollment.findOne({ courseId: course._id, studentId: userId }).select("completedLessons progressPercent status completedAt");
    }

    const outline = modules.map((m) => ({
      _id: m._id,
      title: m.title,
      status: m.status || "upcoming",
      term: m.term || null,
      lessons: lessons.filter((l) => l.moduleId.equals(m._id)),
    }));

    // Students only see quizzes that have questions
    let visibleQuizzes = quizzes;
    if (role === "student") {
      const qCounts = await Question.aggregate([
        { $match: { quizId: { $in: quizzes.map((q) => q._id) } } },
        { $group: { _id: "$quizId", n: { $sum: 1 } } },
      ]);
      const hasQuestions = new Set(qCounts.map((c) => String(c._id)));
      visibleQuizzes = quizzes.filter((q) => hasQuestions.has(String(q._id)));
    }

    res.json({ course, modules: outline, quizzes: visibleQuizzes, enrollment, lessonCount: lessons.length });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/courses/:id/modules → owner
const addModule = async (req, res) => {
  try {
    const course = await findOwnCourse(req.params.id, req);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!req.body.title) return res.status(400).json({ message: "Title is required" });
    const count = await Module.countDocuments({ courseId: course._id });
    const term = toTerm(req.body.term);
    if (term !== null && !TERMS.includes(term)) return res.status(400).json({ message: "Term must be 1, 2 or 3" });
    const mod = await Module.create({
      organizationId: req.user.organizationId, courseId: course._id, title: req.body.title, order: count + 1, term,
    });
    res.status(201).json({ message: "Chapter added ✅", module: mod });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/courses/:id/modules/:moduleId → owner (rename / syllabus status / 📅 term)
const updateModule = async (req, res) => {
  try {
    const course = await findOwnCourse(req.params.id, req);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const mod = await Module.findOne({ _id: req.params.moduleId, courseId: course._id });
    if (!mod) return res.status(404).json({ message: "Chapter not found" });

    const { title, status } = req.body;
    if (title) mod.title = title;
    if ("term" in req.body) {
      const term = toTerm(req.body.term);
      if (term !== null && !TERMS.includes(term)) return res.status(400).json({ message: "Term must be 1, 2 or 3" });
      mod.term = term;
    }
    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
      mod.status = status;
    }
    await mod.save();
    res.json({ message: "Chapter updated ✅", module: mod });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/courses/:id/modules/:moduleId/lessons → owner
const addLesson = async (req, res) => {
  try {
    const course = await findOwnCourse(req.params.id, req);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const mod = await Module.findOne({ _id: req.params.moduleId, courseId: course._id });
    if (!mod) return res.status(404).json({ message: "Chapter not found" });

    const { title, content, videoUrl, topics, durationMinutes } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const count = await Lesson.countDocuments({ moduleId: mod._id });
    const lesson = await Lesson.create({
      organizationId: req.user.organizationId, courseId: course._id, moduleId: mod._id,
      title, content, videoUrl, topics, durationMinutes, order: count + 1,
    });

    const newTopics = (topics || []).filter((t) => !course.topics.includes(t));
    if (newTopics.length) {
      course.topics.push(...newTopics);
      await course.save();
    }
    res.status(201).json({ message: "Lesson added ✅", lesson });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/courses/:id/publish → owner (+ principal gets a notification)
const publishCourse = async (req, res) => {
  try {
    const course = await findOwnCourse(req.params.id, req);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.status === "published") return res.json({ message: "Already published", course });

    const lessonCount = await Lesson.countDocuments({ courseId: course._id });
    if (lessonCount === 0) return res.status(400).json({ message: "Add at least one lesson before publishing" });
    course.status = "published";
    await course.save();

    const [admins, teacher] = await Promise.all([
      User.find({ organizationId: req.user.organizationId, role: "orgadmin" }).select("_id"),
      User.findById(req.user.userId).select("name"),
    ]);
    await notify(req.user.organizationId, admins.map((a) => a._id), {
      type: "course_published",
      title: "📚 New course published",
      message: `${teacher.name} published "${course.title}" with ${lessonCount} lesson(s).`,
      meta: { courseId: course._id },
    });

    res.json({ message: "Course published 🎉 Students can now see it.", course });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { createCourse, listCourses, getCourse, addModule, updateModule, addLesson, publishCourse };