const mongoose = require("mongoose");

// 💬 Class chat: har course ka apna room
// kind: chat = aam baat, question = ❓ Ask teacher, ai = 🤖 AI ka jawab, teacher = 👩‍🏫 teacher ka jawab
const chatMessageSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // AI ke message mein khali
    name: { type: String, required: true },
    role: { type: String, enum: ["student", "instructor", "ai"], required: true },
    text: { type: String, required: true, maxlength: 2000 },
    kind: { type: String, enum: ["chat", "question", "ai", "teacher"], default: "chat" },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" }, // jawab kis sawal ka hai
    answered: Boolean, // question: teacher ne check kar liya?
    review: { type: String, enum: ["pending", "approved", "corrected"] }, // ai: teacher ka faisla
  },
  { timestamps: true }
);

chatMessageSchema.index({ courseId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);