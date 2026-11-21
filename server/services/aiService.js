// ✨ Talks to Google Gemini. The key stays on the server, never in the browser.
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

class AIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const callGemini = async (parts) => {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!key) throw new AIError("AI is not set up yet (GEMINI_API_KEY is missing)", 503);

  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 429) throw new AIError("AI is busy right now. Please try again in a minute ⏳", 429);
  if (!res.ok) throw new AIError(data?.error?.message || "AI request failed", res.status >= 500 ? 502 : 400);

  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) throw new AIError("AI returned an empty answer. Please try again.", 502);
  return text;
};

const askJSON = async (parts) => {
  const text = await callGemini(parts);
  const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new AIError("AI answer was not in the right format. Please try again.", 502);
  }
};

module.exports = { askJSON, AIError };