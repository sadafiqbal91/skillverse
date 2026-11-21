const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // URL mein use hoga: skillverse.com/cityschool
    slug: { type: String, required: true, unique: true, lowercase: true },

    // Har qisam ka institute
    type: {
      type: String,
      enum: ["school", "college", "university", "computer_institute", "online_academy"],
      required: true,
    },

    // Department Profile: har institute ki apni settings
    settings: {
      labels: {
        course: { type: String, default: "Course" },   // school mein "Subject"
        batch: { type: String, default: "Batch" },     // school mein "Class"
      },
      gradingScheme: {
        type: String,
        enum: ["percentage", "gpa", "letter", "passfail"],
        default: "percentage",
      },
      passingMarks: { type: Number, default: 50 },
      timezone: { type: String, default: "Asia/Karachi" },
      features: {
        codingLab: { type: Boolean, default: false },
        parentView: { type: Boolean, default: false },
        aiTutor: { type: Boolean, default: false },
      },
    },

    plan: { type: String, enum: ["free", "basic", "pro"], default: "free" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // createdAt aur updatedAt khud ban jayenge
);

module.exports = mongoose.model("Organization", organizationSchema);