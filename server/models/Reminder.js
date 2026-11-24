const mongoose = require("mongoose");

// 🔔 Early warning reminder: ek bache ko ek subject mein din mein sirf EK baar
const reminderSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    day: { type: String, required: true }, // "2026-11-24" (Pakistan time)
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

reminderSchema.index({ studentId: 1, courseId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("Reminder", reminderSchema);