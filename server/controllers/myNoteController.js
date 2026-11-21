const MyNote = require("../models/MyNote");
const Organization = require("../models/Organization");
const { askJSON, AIError } = require("../services/aiService");

const handleError = (res, error) => {
  if (error instanceof AIError) return res.status(error.status || 502).json({ message: error.message });
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
  if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
  res.status(500).json({ message: error.message });
};

const mine = (req) => ({ organizationId: req.user.organizationId, studentId: req.user.userId });

const listMyNotes = async (req, res) => {
  try {
    const notes = await MyNote.find(mine(req)).sort("-updatedAt");
    res.json({ count: notes.length, notes });
  } catch (error) {
    handleError(res, error);
  }
};

const createMyNote = async (req, res) => {
  try {
    const { title, text = "", topic = "", source = "self" } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ message: "Give your note a title" });
    if (String(text).length > 20000) return res.status(400).json({ message: "Note is too long" });
    const note = await MyNote.create({ ...mine(req), title, text, topic, source: source === "ai" ? "ai" : "self" });
    res.status(201).json({ message: "Note saved ✅", note });
  } catch (error) {
    handleError(res, error);
  }
};

const updateMyNote = async (req, res) => {
  try {
    const note = await MyNote.findOne({ _id: req.params.id, ...mine(req) });
    if (!note) return res.status(404).json({ message: "Note not found" });
    const { title, text, topic } = req.body || {};
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: "Give your note a title" });
      note.title = title;
    }
    if (text !== undefined) note.text = text;
    if (topic !== undefined) note.topic = topic;
    await note.save();
    res.json({ message: "Note updated ✅", note });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteMyNote = async (req, res) => {
  try {
    const r = await MyNote.deleteOne({ _id: req.params.id, ...mine(req) });
    if (!r.deletedCount) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

// ✨ AI notes ka draft (save nahi karta)
const draftMyNote = async (req, res) => {
  try {
    const { topic, question = "" } = req.body || {};
    if (!topic || !String(topic).trim()) return res.status(400).json({ message: "Write a topic first" });

    const org = await Organization.findById(req.user.organizationId).select("type");
    const audience =
      org?.type === "school"
        ? "a school child. Use very simple English and everyday examples from Pakistan"
        : "a beginner student at a computer institute. Be clear and practical";

    const prompt = `Make short, clear study notes for ${audience}.
Topic: ${String(topic).trim()}
${question ? `The student says: "${String(question).trim()}". Focus on explaining that part.` : ""}

Write the "text" as plain text with these parts, each on new lines:
- A 2 to 3 sentence summary
- "Key points:" followed by 4 to 6 lines, each starting with "• "
- "Example:" followed by one simple example
- "Remember:" followed by one short tip

Return ONLY valid JSON: { "title": "a short title", "text": "the notes" }`;

    const ai = await askJSON([{ text: prompt }]);
    const draft = { title: String(ai.title || topic).trim(), text: String(ai.text || "").trim(), topic: String(topic).trim() };
    if (!draft.text) return res.status(502).json({ message: "AI could not make notes. Please try again." });
    res.json({ message: "Notes ready ✨ Read them, then save.", draft });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { listMyNotes, createMyNote, updateMyNote, deleteMyNote, draftMyNote };