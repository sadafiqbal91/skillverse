const Course = require("../models/Course");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const { notify, parentsOf } = require("../services/interventionService");

const handleError = (res, error) => {
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: error.message });
};

const ownsCourse = (courseId, req) =>
  Course.findOne({ _id: courseId, organizationId: req.user.organizationId, instructorId: req.user.userId });

const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const FILE_OK = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/;
const MAX_FILE_CHARS = 6_000_000; // ~4 MB

// 🖼️ Assignment ki picture: photo (JPG/PNG/WEBP) ya AI diagram (SVG)
const IMAGE_OK = /^data:image\/(jpeg|png|webp|svg\+xml);base64,/;

// POST /api/assignments
const createAssignment = async (req, res) => {
  try {
    const { courseId, title, description, topic, dueDate, maxMarks, image, imageKind, imageCaption } = req.body;
    if (!courseId || !title || !dueDate) return res.status(400).json({ message: "Course, title and due date are required" });
    const course = await ownsCourse(courseId, req);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (image) {
      if (!IMAGE_OK.test(image)) return res.status(400).json({ message: "Only photos (JPG, PNG) or AI diagrams are allowed" });
      if (image.length > MAX_FILE_CHARS) return res.status(413).json({ message: "Picture is too big. Please use one under 4 MB" });
    }

    const assignment = await Assignment.create({
      organizationId: req.user.organizationId, courseId, title, description, topic, dueDate, maxMarks,
      image: image || undefined,
      imageKind: image ? (imageKind === "diagram" ? "diagram" : "photo") : undefined,
      imageCaption: image ? String(imageCaption || "").slice(0, 200) : "",
    });

    const ens = await Enrollment.find({ courseId }).select("studentId");
    await notify(req.user.organizationId, ens.map((e) => e.studentId), {
      type: "assignment_new",
      title: `📝 New assignment: ${title}${image ? " 🖼️" : ""}`,
      message: `${course.title}: due on ${fmt(dueDate)}.`,
      meta: { courseId },
    });

    res.status(201).json({ message: "Assignment created ✅ Students were notified.", assignment });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/assignments?courseId=...
const listAssignments = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ message: "courseId is required" });

    if (req.user.role === "student") {
      const enrolled = await Enrollment.findOne({ courseId, studentId: req.user.userId });
      if (!enrolled) return res.status(403).json({ message: "Please enroll first 🎟️" });
    }

    const assignments = await Assignment.find({ courseId, organizationId: req.user.organizationId }).sort("dueDate");
    if (req.user.role === "student") return res.json({ count: assignments.length, assignments });

    const [students, subs] = await Promise.all([
      Enrollment.countDocuments({ courseId }),
      Submission.aggregate([
        { $match: { assignmentId: { $in: assignments.map((a) => a._id) } } },
        { $group: { _id: { a: "$assignmentId", s: "$status" }, n: { $sum: 1 } } },
      ]),
    ]);
    const map = {};
    subs.forEach((x) => {
      const k = String(x._id.a);
      map[k] = map[k] || { submitted: 0, graded: 0 };
      map[k][x._id.s] = x.n;
    });
    res.json({
      count: assignments.length,
      assignments: assignments.map((a) => {
        const m = map[String(a._id)] || { submitted: 0, graded: 0 };
        return { ...a.toObject(), students, submitted: m.submitted + m.graded, graded: m.graded };
      }),
    });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/assignments/:id/submissions → student (text, link, ya 📷 photo/PDF)
const submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const enrolled = await Enrollment.findOne({ courseId: assignment.courseId, studentId: req.user.userId });
    if (!enrolled) return res.status(403).json({ message: "Please enroll first 🎟️" });

    const { content = "", fileUrl = "", attachment, attachmentName, attachmentType } = req.body || {};
    if (attachment) {
      if (!FILE_OK.test(attachment)) return res.status(400).json({ message: "Only photos (JPG, PNG) or PDF files are allowed" });
      if (attachment.length > MAX_FILE_CHARS) return res.status(413).json({ message: "File is too big. Please use a file under 4 MB" });
    }
    if (!content.trim() && !fileUrl.trim() && !attachment) {
      return res.status(400).json({ message: "Add a photo, write an answer, or add a link" });
    }

    const existing = await Submission.findOne({ assignmentId: assignment._id, studentId: req.user.userId });
    if (existing && existing.status === "graded") return res.status(409).json({ message: "Already graded, it can't be changed now" });

    const isLate = Date.now() > new Date(assignment.dueDate).getTime();
    const update = {
      organizationId: req.user.organizationId, courseId: assignment.courseId,
      content, fileUrl, isLate, status: "submitted",
    };
    if (attachment) Object.assign(update, { attachment, attachmentName: attachmentName || "file", attachmentType: attachmentType || "" });

    const submission = await Submission.findOneAndUpdate(
      { assignmentId: assignment._id, studentId: req.user.userId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 🔔 Teacher ko batao
    const [course, student] = await Promise.all([
      Course.findById(assignment.courseId).select("instructorId title"),
      User.findById(req.user.userId).select("name"),
    ]);
    if (course?.instructorId) {
      await notify(req.user.organizationId, [course.instructorId], {
        type: "assignment_submitted",
        title: `📥 ${student?.name || "A student"} submitted "${assignment.title}"${isLate ? " (late)" : ""}`,
        message: `${course.title}: open Grading to check it.`,
        meta: { courseId: assignment.courseId },
      });
    }

    const out = submission.toObject();
    delete out.attachment;
    res.status(201).json({ message: isLate ? "Submitted, but late ⏰" : "Submitted ✅", submission: out });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/assignments/:id/submissions → teacher
const listSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await ownsCourse(assignment.courseId, req))) return res.status(403).json({ message: "This is not your course" });

    const [submissions, ens] = await Promise.all([
      Submission.find({ assignmentId: assignment._id }).populate("studentId", "name email").sort("createdAt"),
      Enrollment.find({ courseId: assignment.courseId }).populate("studentId", "name"),
    ]);
    const done = new Set(submissions.map((s) => String(s.studentId?._id)));
    const notSubmitted = ens.filter((e) => e.studentId && !done.has(String(e.studentId._id))).map((e) => e.studentId.name);

    res.json({ assignment, count: submissions.length, submissions, notSubmitted });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/submissions/:id/grade → teacher
const gradeSubmission = async (req, res) => {
  try {
    const submission = await Submission.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    if (!(await ownsCourse(submission.courseId, req))) return res.status(403).json({ message: "This is not your course" });

    const assignment = await Assignment.findById(submission.assignmentId);
    const { marks, feedback } = req.body;
    if (typeof marks !== "number" || marks < 0 || marks > assignment.maxMarks) {
      return res.status(400).json({ message: `Marks must be between 0 and ${assignment.maxMarks}` });
    }

    submission.marks = marks;
    submission.feedback = feedback || "";
    submission.status = "graded";
    submission.gradedAt = new Date();
    await submission.save();

    const parents = await parentsOf(submission.studentId);
    await notify(req.user.organizationId, [submission.studentId, ...parents], {
      type: "assignment_graded",
      title: `✅ "${assignment.title}" checked: ${marks}/${assignment.maxMarks}`,
      message: feedback ? `Teacher's feedback: ${feedback}` : "Open the course to see your result.",
      meta: { courseId: submission.courseId },
    });

    res.json({ message: "Graded ✅ Student and parents were notified." });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/submissions/me → student (badi file ke bina)
const mySubmissions = async (req, res) => {
  const submissions = await Submission.find({ organizationId: req.user.organizationId, studentId: req.user.userId })
    .select("-attachment")
    .populate("assignmentId", "title maxMarks dueDate")
    .sort("-createdAt");
  res.json({ count: submissions.length, submissions });
};

module.exports = { createAssignment, listAssignments, submitAssignment, listSubmissions, gradeSubmission, mySubmissions };