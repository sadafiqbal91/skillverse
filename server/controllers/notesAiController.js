const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Organization = require("../models/Organization");
const { askJSON, AIError } = require("../services/aiService");

// POST /api/interventions/notes/draft → teacher: ✨ AI writes a notes DRAFT (teacher edits before sending)
const draftNotes = async (req, res) => {
  try {
    const { courseId, topic } = req.body;
    if (!courseId || !topic) return res.status(400).json({ message: "Course and topic are required" });

    const course = await Course.findOne({ _id: courseId, organizationId: req.user.organizationId, instructorId: req.user.userId });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const [lessons, org] = await Promise.all([
      Lesson.find({ courseId, topics: topic }).select("title content"),
      Organization.findById(req.user.organizationId).select("type"),
    ]);
    const material = lessons.filter((l) => l.content).map((l) => `${l.title}:\n${l.content}`).join("\n\n").slice(0, 6000);
    const audience = org?.type === "school" ? "school children (very simple words, short sentences)" : "students at a computer institute or college";

    const prompt = `You are a kind teacher writing short revision notes for ${audience} on "${topic}" (course: ${course.title}).
Write plain text (no markdown symbols like # or **). Use this layout:
1) A simple explanation in 3-4 sentences.
2) "Key points:" then 4 lines starting with "• ".
3) "Example:" then one small worked example.
4) "Common mistakes:" then 3 lines starting with "• ".
5) "Check yourself:" then 3 short questions.
${material ? `Base the notes on this lesson material:\n${material}` : ""}
Return ONLY JSON: {"title":"short title","text":"the notes with \\n line breaks"}`;

    const out = await askJSON([{ text: prompt }]);
    if (!out?.text) return res.status(502).json({ message: "AI could not write notes this time. Please try again." });
    res.json({ title: out.title || `${topic}: quick revision`, text: out.text });
  } catch (error) {
    if (error instanceof AIError) return res.status(error.status).json({ message: error.message });
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { draftNotes };