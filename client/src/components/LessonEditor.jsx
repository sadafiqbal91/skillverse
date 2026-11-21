import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Plus, Trash2, Save } from "lucide-react";
import api, { errMsg } from "../api/api";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const label = "mb-1 block text-xs font-medium text-gray-400";
const split = (s) => s.split(",").map((t) => t.trim()).filter(Boolean);

// ✏️ Teacher ka lesson editor (+ ✨ AI draft)
export default function LessonEditor({ lessonId, courseId, onClose, onSaved }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [ai, setAi] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/lessons/${lessonId}`)
      .then(({ data: l }) =>
        setF({
          title: l.title || "",
          videoUrl: l.videoUrl || "",
          durationMinutes: l.durationMinutes || "",
          topics: (l.topics || []).join(", "),
          content: l.content || "",
          keyPoints: (l.keyPoints || []).join("\n"),
          example: l.example || "",
          exampleCode: l.exampleCode || "",
          checkYourself: (l.checkYourself || []).map((c) => ({ question: c.question, answer: c.answer })),
        })
      )
      .catch((e) => setErr(errMsg(e)));
  }, [lessonId]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setCheck = (i, k, v) =>
    setF((x) => ({ ...x, checkYourself: x.checkYourself.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  const draft = async () => {
    setAi(true);
    setErr("");
    setNote("");
    try {
      const r = await api.post("/lessons/draft", { courseId, title: f.title, topics: split(f.topics) });
      const d = r.data.draft;
      setF((x) => ({
        ...x,
        content: d.content,
        keyPoints: d.keyPoints.join("\n"),
        example: d.example,
        exampleCode: d.exampleCode,
        checkYourself: d.checkYourself,
      }));
      setNote("✨ AI draft added. Please read it and fix anything before saving.");
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setAi(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api.patch(`/lessons/${lessonId}`, {
        title: f.title,
        videoUrl: f.videoUrl,
        durationMinutes: Number(f.durationMinutes) || 10,
        topics: split(f.topics),
        content: f.content,
        keyPoints: f.keyPoints.split("\n").map((s) => s.trim()).filter(Boolean),
        example: f.example,
        exampleCode: f.exampleCode,
        checkYourself: f.checkYourself.filter((c) => c.question.trim()),
      });
      onSaved?.();
      onClose();
    } catch (e2) {
      setErr(errMsg(e2));
      setSaving(false);
    }
  };

  return createPortal(
    <div className="bg-black/70 backdrop-blur-sm p-4" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#12122a] p-6 text-white shadow-2xl page-enter">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">✏️ Edit lesson</h2>
            <p className="text-sm text-gray-400">Write it yourself, or let AI draft it and you check.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>

        {!f && !err && <div className="h-60 animate-pulse rounded-xl bg-white/5" />}
        {err && !f && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{err}</p>}

        {f && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><span className={label}>Lesson title</span><input className={input} value={f.title} onChange={set("title")} required /></div>
              <div><span className={label}>Topic(s), comma separated</span><input className={input} value={f.topics} onChange={set("topics")} placeholder="e.g. Plants" /></div>
              <div><span className={label}>YouTube link (optional)</span><input className={input} value={f.videoUrl} onChange={set("videoUrl")} /></div>
              <div><span className={label}>Minutes</span><input className={input} type="number" min="1" value={f.durationMinutes} onChange={set("durationMinutes")} /></div>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-violet-100">✨ AI can write the explanation, key points, example and 3 check questions from the title and topic.</p>
              <button type="button" onClick={draft} disabled={ai || !f.title.trim()}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                <Sparkles size={16} /> {ai ? "Writing..." : "Draft with AI"}
              </button>
            </div>
            {note && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{note}</p>}

            <div><span className={label}>📝 Explanation</span>
              <textarea className={input} rows={7} value={f.content} onChange={set("content")} placeholder="Explain the idea in simple words..." />
            </div>
            <div><span className={label}>🔑 Key points (one per line)</span>
              <textarea className={input} rows={4} value={f.keyPoints} onChange={set("keyPoints")} />
            </div>
            <div><span className={label}>💡 Real-life example</span>
              <textarea className={input} rows={2} value={f.example} onChange={set("example")} />
            </div>
            <div><span className={label}>💻 Example code (only for computer lessons)</span>
              <textarea className={`${input} font-mono`} rows={4} value={f.exampleCode} onChange={set("exampleCode")} placeholder="<h1>Hello</h1>" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={label}>✅ Check yourself</span>
                <button type="button" onClick={() => setF({ ...f, checkYourself: [...f.checkYourself, { question: "", answer: "" }] })}
                  className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"><Plus size={13} /> Add question</button>
              </div>
              <div className="space-y-2">
                {!f.checkYourself.length && <p className="text-xs text-gray-500">No questions yet.</p>}
                {f.checkYourself.map((c, i) => (
                  <div key={i} className="grid gap-2 rounded-xl bg-black/20 p-3 md:grid-cols-[1fr_1fr_auto]">
                    <input className={input} placeholder="Question" value={c.question} onChange={(e) => setCheck(i, "question", e.target.value)} />
                    <input className={input} placeholder="Answer" value={c.answer} onChange={(e) => setCheck(i, "answer", e.target.value)} />
                    <button type="button" onClick={() => setF({ ...f, checkYourself: f.checkYourself.filter((_, j) => j !== i) })}
                      className="rounded-lg p-2 text-gray-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            {err && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
            <div className="flex gap-2">
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving..." : "Save lesson"}
              </button>
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}