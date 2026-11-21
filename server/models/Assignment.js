const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    topic: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, default: 10 },
    // 🖼️ Bachon ke liye picture: teacher ki photo ya ✨ AI diagram (data URL, Mongo mein)
    image: { type: String },
    imageKind: { type: String, enum: ["photo", "diagram"] },
    imageCaption: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);