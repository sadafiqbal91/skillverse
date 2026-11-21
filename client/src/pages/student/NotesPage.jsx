import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText, Download, ExternalLink, ArrowRight, UserRound, CalendarDays,
  Plus, Sparkles, Pencil, Trash2, Save, Inbox, NotebookPen,
} from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Loading, ErrorBox } from "../../components/ui";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// 📥 Note ko .txt file bana kar download
const downloadTxt = (name, lines) => {
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.txt`.replace(/\s+/g, "-");
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------------- 📥 From Teacher ---------------- */
function TeacherNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState(null);
  const [ivs, setIvs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/interventions/notes/me"), api.get("/interventions/me")])
      .then(([n, i]) => {
        setNotes(n.data.notes);
        setIvs(i.data.interventions);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <ErrorBox text={error} />;
  if (!notes) return <Loading />;

  const retestFor = (n) =>
    ivs.find((i) => i.topic === n.topic && i.courseId?._id === n.courseId?._id && (i.level !== "intervention" || i.notesSent));

  if (!notes.length) {
    return (
      <Card className="text-center py-14">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center">
          <FileText size={26} />
        </div>
        <h3 className="font-semibold text-lg">No notes from teachers yet</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">When your teacher sends notes, they will appear here.</p>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 stagger">
      {notes.map((n) => {
        const iv = retestFor(n);
        return (
          <Card key={n._id} className="flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <Badge className="bg-violet-500/15 text-violet-300">{n.topic}</Badge>
              <span className="text-xs text-gray-500 truncate">{n.courseId?.title}</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{n.title}</h3>
            <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed flex-1">{n.text}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-4">
              <span className="flex items-center gap-1"><UserRound size={14} /> {n.createdBy?.name}</span>
              <span className="flex items-center gap-1"><CalendarDays size={14} /> {fmt(n.createdAt)}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => downloadTxt(`${n.topic}-${n.title}`, [n.title, `Topic: ${n.topic}`, `Course: ${n.courseId?.title}`, `From: ${n.createdBy?.name}`, "", n.text, n.fileUrl ? `\nAttachment: ${n.fileUrl}` : ""])}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5">
                <Download size={15} /> Download
              </button>
              {n.fileUrl && (
                <a href={n.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5">
                  <ExternalLink size={15} /> Attachment
                </a>
              )}
              {iv && (
                <button onClick={() => navigate(`/student/retest/${iv._id}`)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-1.5 text-sm font-medium hover:opacity-90">
                  Take re-test <ArrowRight size={15} />
                </button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- ✏️ My own notes ---------------- */
const EMPTY = { _id: null, title: "", topic: "", text: "", source: "self" };

function MyNotes() {
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [editor, setEditor] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [ai, setAi] = useState({ topic: "", question: "" });
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    api.get("/my-notes").then((r) => setNotes(r.data.notes)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (text, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 3500);
  };

  const makeWithAI = async (e) => {
    e.preventDefault();
    setAiBusy(true);
    try {
      const r = await api.post("/my-notes/ai", ai);
      setEditor({ ...EMPTY, ...r.data.draft, source: "ai" });
      setAiOpen(false);
      setAi({ topic: "", question: "" });
      flash("✨ Notes ready. Read them, change anything, then save.");
    } catch (e2) {
      flash(errMsg(e2), true);
    } finally {
      setAiBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { title: editor.title, topic: editor.topic, text: editor.text, source: editor.source };
      if (editor._id) await api.patch(`/my-notes/${editor._id}`, body);
      else await api.post("/my-notes", body);
      setEditor(null);
      flash("Note saved ✅");
      load();
    } catch (e2) {
      flash(errMsg(e2), true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    try {
      await api.delete(`/my-notes/${n._id}`);
      flash("Note deleted");
      load();
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  if (error) return <ErrorBox text={error} />;
  if (!notes) return <Loading />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setEditor({ ...EMPTY }); setAiOpen(false); }}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
          <Plus size={16} /> New note
        </button>
        <button onClick={() => { setAiOpen((o) => !o); setEditor(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold hover:opacity-90">
          <Sparkles size={16} /> Make notes with AI
        </button>
      </div>

      {msg && (
        <div className={`page-enter rounded-xl border px-4 py-3 text-sm ${msg.bad ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{msg.text}</div>
      )}

      {aiOpen && (
        <Card className="page-enter border-violet-500/30">
          <form onSubmit={makeWithAI} className="space-y-3">
            <p className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-violet-300" /> Make notes with AI</p>
            <input className={input} placeholder="Topic, e.g. Photosynthesis or HTML tags" value={ai.topic} onChange={(e) => setAi({ ...ai, topic: e.target.value })} required />
            <textarea className={input} rows={2} placeholder="What is confusing you? (optional) e.g. I don't understand why leaves are green"
              value={ai.question} onChange={(e) => setAi({ ...ai, question: e.target.value })} />
            <p className="text-xs text-gray-500">AI can make mistakes. Read the notes and check with your book or teacher.</p>
            <div className="flex gap-2">
              <button disabled={aiBusy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
                <Sparkles size={15} /> {aiBusy ? "Writing notes..." : "Make my notes"}
              </button>
              <button type="button" onClick={() => setAiOpen(false)} className="rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {editor && (
        <Card className="page-enter">
          <form onSubmit={save} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{editor._id ? "Edit note" : "New note"}</p>
              {editor.source === "ai" && <Badge className="bg-fuchsia-500/15 text-fuchsia-300">✨ Made with AI</Badge>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={input} placeholder="Title" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} required />
              <input className={input} placeholder="Topic (optional)" value={editor.topic} onChange={(e) => setEditor({ ...editor, topic: e.target.value })} />
            </div>
            <textarea className={input} rows={12} placeholder="Write your notes here..." value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })} />
            <div className="flex gap-2">
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
                <Save size={15} /> {saving ? "Saving..." : "Save note"}
              </button>
              <button type="button" onClick={() => setEditor(null)} className="rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {!notes.length && !editor ? (
        <Card className="text-center py-14">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center">
            <NotebookPen size={26} />
          </div>
          <h3 className="font-semibold text-lg">Your notebook is empty</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">Write your own notes, or let ✨ AI make them for any topic.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 stagger">
          {notes.map((n) => {
            const open = expanded === n._id;
            return (
              <Card key={n._id} className="flex flex-col">
                <div className="mb-3 flex items-center justify-between gap-2">
                  {n.topic ? <Badge className="bg-violet-500/15 text-violet-300">{n.topic}</Badge> : <span />}
                  <Badge className={n.source === "ai" ? "bg-fuchsia-500/15 text-fuchsia-300" : "bg-white/5 text-gray-400"}>
                    {n.source === "ai" ? "✨ AI" : "✏️ Mine"}
                  </Badge>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{n.title}</h3>
                <p className={`flex-1 whitespace-pre-line text-sm leading-relaxed text-gray-300 ${open ? "" : "line-clamp-6"}`}>{n.text}</p>
                {n.text.length > 300 && (
                  <button onClick={() => setExpanded(open ? null : n._id)} className="mt-1 self-start text-xs text-violet-300 hover:text-violet-200">
                    {open ? "Show less" : "Read more"}
                  </button>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                  <span className="mr-auto flex items-center gap-1 text-xs text-gray-500"><CalendarDays size={14} /> {fmt(n.updatedAt)}</span>
                  <button onClick={() => { setEditor({ ...n }); setAiOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"><Pencil size={14} /> Edit</button>
                  <button onClick={() => downloadTxt(n.title, [n.title, n.topic ? `Topic: ${n.topic}` : "", "", n.text])}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"><Download size={14} /></button>
                  <button onClick={() => remove(n)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function NotesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "mine" ? "mine" : "teacher";
  const TABS = [
    ["teacher", "From Teacher", Inbox],
    ["mine", "My Notes", NotebookPen],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Notes</h1>
        <p className="text-gray-400 mt-1">Notes from your teachers, and your own notebook (write it yourself or with ✨ AI).</p>
      </div>

      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setParams(key === "mine" ? { tab: "mine" } : {})}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-violet-600 text-white shadow" : "text-gray-400 hover:text-white"
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "teacher" ? <TeacherNotes /> : <MyNotes />}
    </div>
  );
}