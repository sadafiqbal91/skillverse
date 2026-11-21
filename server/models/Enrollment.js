const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
    progressPercent: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed"], default: "active" },
    completedAt: Date,
  },
  { timestamps: true }
);

enrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);