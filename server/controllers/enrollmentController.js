const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Attempt = require("../models/Attempt");

// POST /api/courses/:id/enroll → student
const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, organizationId: req.user.organizationId, status: "published" });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const enrollment = await Enrollment.create({
      organizationId: req.user.organizationId, courseId: course._id, studentId: req.user.userId,
    });
    res.status(201).json({ message: "You're enrolled 🎟️", enrollment });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You are already enrolled in this course" });
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

// GET /api/courses/:id/certificate → student (only after completing the course)
const getCertificate = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).populate("instructorId", "name");
    if (!course) return res.status(404).json({ message: "Course not found" });

    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: req.user.userId });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course" });
    if (enrollment.status !== "completed") {
      return res.status(400).json({
        message: "Complete all lessons to unlock your certificate",
        progressPercent: enrollment.progressPercent,
        courseTitle: course.title,
      });
    }

    const [student, org, attempts] = await Promise.all([
      User.findById(req.user.userId).select("name"),
      Organization.findById(req.user.organizationId).select("name"),
      Attempt.find({ studentId: req.user.userId, courseId: course._id, status: "submitted", kind: "regular" }).select("percent"),
    ]);
    const averageQuizPercent = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.percent, 0) / attempts.length)
      : null;

    res.json({
      certificateId: String(enrollment._id).slice(-10).toUpperCase(),
      studentName: student.name,
      courseTitle: course.title,
      instructorName: course.instructorId?.name,
      institute: org.name,
      completedAt: enrollment.completedAt || enrollment.updatedAt,
      lessons: enrollment.completedLessons.length,
      averageQuizPercent,
    });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { enrollInCourse, getCertificate };