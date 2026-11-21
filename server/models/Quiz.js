const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    timeLimitMinutes: { type: Number, default: 10 },
    questionsPerAttempt: { type: Number, default: 5 }, // random picks from the question bank
    // practice = normal quiz, retest = weak topic re-test, revision = 📝 exam prep (marks count in report card)
    kind: { type: String, enum: ["practice", "retest", "revision"], default: "practice" },
    chapterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }], // 📝 revision: kin chapters se bana
    testDate: Date, // 📅 optional: announced to students + parents
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);