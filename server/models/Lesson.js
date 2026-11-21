const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },        // 📝 Explanation
    keyPoints: [{ type: String, trim: true }],      // 🔑 Yaad rakhne wali baatein
    example: { type: String, default: "" },        // 💡 Misaal
    exampleCode: { type: String, default: "" },    // 💻 Code (sirf computer subject)
    checkYourself: [{ question: String, answer: String }], // ✅ Khud ko check karo
    videoUrl: { type: String, default: "" },
    topics: [{ type: String, trim: true }],
    durationMinutes: { type: Number, default: 10 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);