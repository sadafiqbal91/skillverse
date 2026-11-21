const mongoose = require("mongoose");

const interventionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true },
    // 🟡 watch → 🌱 needs_practice → 🔴 intervention → 🙋 one_on_one → ✅ resolved
    level: {
      type: String,
      enum: ["watch", "needs_practice", "intervention", "one_on_one", "resolved"],
      default: "watch",
    },
    startPercent: Number,
    latestPercent: Number,
    notesSent: { type: Boolean, default: false },
    retestsTaken: { type: Number, default: 0 }, // max 3
    seenQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }], // never repeat in re-tests
    history: [{ event: String, percent: Number, round: Number, at: { type: Date, default: Date.now } }],
    resolvedAt: Date,
  },
  { timestamps: true }
);

interventionSchema.index({ studentId: 1, courseId: 1, topic: 1, level: 1 });

module.exports = mongoose.model("Intervention", interventionSchema);