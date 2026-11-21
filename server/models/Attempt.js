const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }, // re-test mein quiz nahi hota
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["regular", "retest"], default: "regular" },
    interventionId: { type: mongoose.Schema.Types.ObjectId, ref: "Intervention" },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        selectedIndex: Number,
        isCorrect: Boolean,
      },
    ],
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    topicScores: [{ topic: String, correct: Number, total: Number, percent: Number }],
    status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
    isLate: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    submittedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);