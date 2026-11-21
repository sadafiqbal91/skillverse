const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    topic: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    text: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // weak = weak students only · class = whole class · selected = students the teacher picked
    audience: { type: String, enum: ["weak", "class", "selected"], default: "weak" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);