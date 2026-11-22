const mongoose = require("mongoose");

// 🌳 School Tree: Class (school) / Section (college) / Batch (computer institute)
// Purane courses ko chhoota nahi, sirf unhein ek group mein jorta hai.
const schoolClassSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true }, // "Class 5-A" / "Web Dev Morning"
    classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // class teacher / coordinator
    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }], // subjects
    timetable: [
      {
        day: { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
        time: String, // "09:00"
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
      },
    ],
  },
  { timestamps: true }
);

schoolClassSchema.index({ organizationId: 1, name: 1 });

module.exports = mongoose.model("SchoolClass", schoolClassSchema);