const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    topics: [{ type: String, trim: true }], // maslan ["JWT", "REST API"]
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

courseSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model("Course", courseSchema);