const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, select: false }, // 🔐 never sent to students
    topic: { type: String, required: true, trim: true }, // ⭐ used for weak-topic detection
    important: { type: Boolean, default: false }, // ⭐ "likely in the exam"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);