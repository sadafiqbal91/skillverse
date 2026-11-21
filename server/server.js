require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const app = express();
app.set("trust proxy", 1); // Vercel ke peeche asli user ka IP

// 🪖 Security headers
app.use(helmet());

// 🌐 CORS: sirf hamari website hi backend se baat kare
const allowed = [
  ...(process.env.CLIENT_URL || "").split(",").map((s) => s.trim()).filter(Boolean),
  "http://localhost:5173",
  "http://localhost:5174",
];
app.use(
  cors({
    origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  })
);

// 📦 JSON (photo upload ke liye 8 MB tak)
app.use(express.json({ limit: "8mb" }));

// 🚦 Rate limits
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: "Too many tries. Please wait 15 minutes and try again." } })
);
app.use(
  ["/api/lessons/draft", "/api/my-notes/ai", "/api/interventions/notes/draft", "/api/diagram"],
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 40, message: { message: "AI limit reached. Please try again in an hour." } })
);

connectDB();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "SkillVerse" });
});

// Routes
app.use("/api/organizations", require("./routes/organizationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/lessons", require("./routes/lessonRoutes"));
app.use("/api/quizzes", require("./routes/quizRoutes"));
app.use("/api/attempts", require("./routes/attemptRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/submissions", require("./routes/submissionRoutes"));
app.use("/api/interventions", require("./routes/interventionRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/parents", require("./routes/parentRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/results", require("./routes/resultRoutes"));
app.use("/api/my-notes", require("./routes/myNoteRoutes"));
app.use("/api/answers", require("./routes/answerRoutes"));
app.use("/api/summary", require("./routes/summaryRoutes"));
app.use("/api/chat", require("./routes/chatRoutes")); // 💬 Class chat + Ask teacher
app.use("/api/diagram", require("./routes/diagramRoutes")); // ✨ AI diagram for assignments

// ❌ Koi bhi error: saaf message
app.use((err, req, res, next) => {
  const status = err.message === "Not allowed by CORS" ? 403 : err.type === "entity.too.large" ? 413 : 500;
  res.status(status).json({ message: status === 413 ? "File is too big" : err.message });
});

// 💻 Local par server chalao, Vercel par app export karo
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
}
module.exports = app;