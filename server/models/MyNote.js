const mongoose = require("mongoose");

// ✏️ Student ke APNE notes (teacher wale "Note" se alag)
const myNoteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    text: { type: String, default: "" },
    source: { type: String, enum: ["self", "ai"], default: "self" },
  },
  { timestamps: true }
);

myNoteSchema.index({ studentId: 1, updatedAt: -1 });

module.exports = mongoose.model("MyNote", myNoteSchema);