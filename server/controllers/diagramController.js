const Course = require("../models/Course");
const Organization = require("../models/Organization");
const { askJSON, AIError } = require("../services/aiService");

const MAX_SVG = 40000;

// 🧼 SVG ko saaf karo: koi script, link ya bahar ki cheez nahi
const cleanSvg = (raw) => {
  let svg = String(raw || "").trim();
  const start = svg.indexOf("<svg");
  const end = svg.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  svg = svg.slice(start, end + 6);
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<image[\s\S]*?(\/>|<\/image>)/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("[^"]*"|'[^']*')/gi, "");
  if (!/xmlns=/.test(svg.slice(0, 200))) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (svg.length > MAX_SVG) return null;
  return svg;
};

// POST /api/diagram  { courseId, prompt } → ✨ AI se diagram (free: Gemini text se SVG banata hai)
const makeDiagram = async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim().slice(0, 300);
    if (prompt.length < 3) return res.status(400).json({ message: "Describe the picture first, e.g. a pizza cut into 4 parts" });

    const course = await Course.findOne({ _id: req.body.courseId, organizationId: req.user.organizationId, instructorId: req.user.userId }).select("title");
    if (!course) return res.status(404).json({ message: "Course not found" });
    const org = await Organization.findById(req.user.organizationId).select("type");
    const young = org && org.type === "school";

    const ask = [
      "Draw a clear educational diagram as SVG code for the course \"" + course.title + "\".",
      "The picture: " + prompt,
      young ? "It is for young school children: bright friendly colours, big shapes, very simple labels." : "It is for students: clean, simple, clearly labelled.",
      "Rules:",
      '- Root element: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">',
      "- First draw a white background rect covering the whole picture.",
      "- Use only basic shapes (rect, circle, ellipse, line, polygon, path) and <text> with font-family=\"Arial\" and font-size 14 to 22.",
      "- Keep everything inside the 400 x 300 box. Labels must not overlap.",
      "- Be mathematically and factually correct (e.g. a fraction must show equal parts with the right number shaded).",
      "- No scripts, no images, no links, no animation, no foreignObject.",
      'Return only JSON: {"svg":"<svg ...>...</svg>","caption":"one short sentence describing the picture"}',
    ].join("\n");

    const out = await askJSON([{ text: ask }]);
    const svg = cleanSvg(out && out.svg);
    if (!svg) return res.status(502).json({ message: "AI could not draw this one. Try describing it more simply." });

    res.json({
      image: "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64"),
      caption: String((out && out.caption) || prompt).slice(0, 200),
    });
  } catch (error) {
    if (error instanceof AIError) return res.status(error.status || 502).json({ message: error.message });
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid ID" });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { makeDiagram };