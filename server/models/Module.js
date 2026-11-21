const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    // 📚 Syllabus tracker: upcoming → this_week → covered
    status: { type: String, enum: ["upcoming", "this_week", "covered"], default: "upcoming" },
    // 📅 Kis term ka chapter hai (1, 2, 3) — khali = abhi tay nahi
    term: { type: Number, enum: [1, 2, 3, null], default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Module", moduleSchema);