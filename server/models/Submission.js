const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    // 📷 Photo / PDF
    attachment: { type: String, default: "" },
    attachmentName: { type: String, default: "" },
    attachmentType: { type: String, default: "" },
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
    marks: Number,
    feedback: String,
    gradedAt: Date,
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);