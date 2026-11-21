import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Sprout, LifeBuoy, UserRound, Send, Sparkles, Loader2, X, FileText, Megaphone, History, Check } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Empty, Loading, ErrorBox } from "../../components/ui";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const COLS = [
  { key: "needs_practice", label: "Practising", hint: "Auto re-test", icon: Sprout, cls: "text-emerald-300 bg-emerald-500/10" },
  { key: "intervention", label: "Need your notes", hint: "Send once, all get them", icon: LifeBuoy, cls: "text-rose-300 bg-rose-500/10" },
  { key: "one_on_one", label: "1-on-1", hint: "Tried 3 times", icon: UserRound, cls: "text-amber-300 bg-amber-500/10" },
];

const AUDIENCE = {
  weak: { label: "Weak students", cls: "bg-rose-500/15 text-rose-300" },
  class: { label: "Whole class", cls: "bg-violet-500/15 text-violet-300" },
  selected: { label: "Chosen students", cls: "bg-cyan-500/15 text-cyan-300" },
};

function NotesForm({ courseId, topic, audience, studentIds = [], label, onSent, onClose, flash }) {
  const [form, setForm] = useState({ title: `${topic}: quick revision`, text: "", fileUrl: "" });
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { setForm((f) => ({ ...f, title: `${topic}: quick revision` })); }, [topic]);

  const draft = async () => {
    setDrafting(true);
    try {
      const r = await api.post("/interventions/notes/draft", { courseId, topic });
      setForm((f) => ({ ...f, title: r.data.title, text: r.data.text }));
      flash("✨ Draft ready. Read it, edit anything, then send.");
    } catch (e) {
      flash(errMsg(e), true);
    } finally {
      setDrafting(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (audience === "selected" && !studentIds.length) return flash("Please choose at least one student", true);
    setSending(true);
    try {
      const r = await api.post("/interventions/notes", { courseId, topic, audience, studentIds, ...form, fileUrl: form.fileUrl || undefined });
      flash(r.data.message);
      onSent();
    } catch (e2) {
      flash(errMsg(e2), true);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 page-enter">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">📄 Notes on <b>{topic}</b> · {label}</p>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10"><X size={16} /></button>}
      </div>
      <button type="button" onClick={draft} disabled={drafting}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20 disabled:opacity-50">
        {drafting ? <><Loader2 size={16} className="animate-spin" /> AI is writing notes...</> : <><Sparkles size={16} /> Draft notes with AI</>}
      </button>
      <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <textarea className={input} rows={10} placeholder="Write your own notes here, or use AI above and edit" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
      <input className={input} placeholder="Link (optional): YouTube, PDF, Google Drive" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
      <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        <Send size={16} /> {sending ? "Sending..." : "Send notes"}
      </button>
    </form>
  );
}

function ShareCard({ courseId, topics, students, flash, onSent }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("class");
  const [topic, setTopic] = useState(topics[0] || "");
  const [picked, setPicked] = useState([]);

  useEffect(() => { setTopic(topics[0] || ""); setPicked([]); }, [courseId, topics]);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Card title="Share notes with the class or chosen students" icon={Megaphone}
      action={!open && <button onClick={() => setOpen(true)} className="text-sm text-violet-300 hover:text-violet-200">Write notes</button>}>
      <p className="text-sm text-gray-400">Not only for weak students: send revision notes to everyone, or pick students yourself.</p>
      {open && (
        <div className="mt-4 space-y-3 page-enter">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex rounded-xl bg-black/30 p-1 text-sm">
              {[["class", "Whole class"], ["selected", "Choose students"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setMode(k)}
                  className={`flex-1 rounded-lg py-1.5 font-medium transition ${mode === k ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
                  {l}
                </button>
              ))}
            </div>
            <select className={input} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((t) => <option key={t} value={t} className="bg-[#12122a]">{t}</option>)}
            </select>
          </div>

          {mode === "selected" && (
            <div className="flex flex-wrap gap-2">
              {!students.length && <p className="text-sm text-gray-500">No students enrolled yet.</p>}
              {students.map((s) => {
                const on = picked.includes(s._id);
                return (
                  <button key={s._id} type="button" onClick={() => toggle(s._id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-gray-400 hover:text-white"}`}>
                    {on && <Check size={14} />} {s.name}
                  </button>
                );
              })}
            </div>
          )}

          {topic && (
            <NotesForm courseId={courseId} topic={topic} audience={mode} studentIds={picked} flash={flash}
              label={mode === "class" ? `whole class (${students.length}) + parents` : `${picked.length} chosen student(s) + parents`}
              onClose={() => setOpen(false)} onSent={() => { setOpen(false); setPicked([]); onSent(); }} />
          )}
        </div>
      )}
    </Card>
  );
}

export default function WeakTopicsPage() {
  const [courses, setCourses] = useState(null);
  const [cid, setCid] = useState("");
  const [data, setData] = useState(null);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [openTopic, setOpenTopic] = useState(null);

  useEffect(() => {
    api.get("/courses?mine=true")
      .then((r) => { setCourses(r.data.courses); if (r.data.courses[0]) setCid(r.data.courses[0]._id); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const load = useCallback(() => {
    if (!cid) return;
    Promise.all([api.get(`/interventions?courseId=${cid}`), api.get(`/interventions/notes/sent?courseId=${cid}`)])
      .then(([a, b]) => { setData(a.data); setSent(b.data.notes); })
      .catch((e) => setError(errMsg(e)));
  }, [cid]);
  useEffect(() => { setData(null); setOpenTopic(null); load(); }, [load]);

  const flash = useCallback((text, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  if (error) return <ErrorBox text={error} />;
  if (!courses) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Weak Topics & Notes</h1>
        <p className="mt-1 text-gray-400">Who is stuck, where, and in which round. Send notes to weak students, the whole class, or chosen students.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {courses.map((c) => (
          <button key={c._id} onClick={() => setCid(c._id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${c._id === cid ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            {c.title}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`page-enter rounded-xl border px-4 py-3 text-sm ${msg.bad ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{msg.text}</div>
      )}

      {!data ? <Loading /> : (
        <>
          {!data.topics.length ? (
            <Card><Empty text="No weak topics right now 🎉 Everyone is on track." /></Card>
          ) : (
            <div className="space-y-5 stagger">
              {data.topics.map((t) => {
                const needNotes = t.intervention.length + t.one_on_one.length;
                const waiting = t.intervention.filter((s) => !s.notesSent).length;
                return (
                  <Card key={t.topic}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-400" />
                        <h3 className="text-lg font-semibold">{t.topic}</h3>
                        <Badge className="bg-white/5 text-gray-400">{t.needs_practice.length + needNotes} student(s)</Badge>
                        {waiting > 0 && <Badge className="bg-rose-500/15 text-rose-300">{waiting} waiting for notes</Badge>}
                      </div>
                      {needNotes > 0 && openTopic !== t.topic && (
                        <button onClick={() => setOpenTopic(t.topic)} className="inline-flex items-center gap-2 self-start rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">
                          <FileText size={16} /> Send notes to weak students
                        </button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {COLS.map((col) => (
                        <div key={col.key} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${col.cls}`}><col.icon size={14} /></span>
                            <div>
                              <p className="text-sm font-medium">{col.label} · {t[col.key].length}</p>
                              <p className="text-[11px] text-gray-500">{col.hint}</p>
                            </div>
                          </div>
                          {!t[col.key].length ? <p className="text-xs text-gray-600">Nobody</p> : (
                            <ul className="space-y-1.5">
                              {t[col.key].map((s, i) => (
                                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-sm">
                                  <span>{s.name}</span>
                                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                    {s.percent != null && <span>{s.percent}%</span>}
                                    <span>· try {Math.min((s.retestsTaken || 0) + (col.key === "one_on_one" ? 0 : 1), s.maxRounds || 3)}/{s.maxRounds || 3}</span>
                                    {col.key === "intervention" && (s.notesSent ? <span className="text-emerald-300">📄 sent</span> : <span className="text-rose-300">⏳</span>)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>

                    {openTopic === t.topic && (
                      <NotesForm courseId={cid} topic={t.topic} audience="weak" label={`${needNotes} weak student(s) + parents`} flash={flash}
                        onClose={() => setOpenTopic(null)} onSent={() => { setOpenTopic(null); load(); }} />
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <ShareCard courseId={cid} topics={data.courseTopics || []} students={data.students || []} flash={flash} onSent={load} />

          <Card title="Sent notes" icon={History}>
            {!sent.length ? <Empty text="No notes sent from this course yet." /> : (
              <ul className="space-y-2">
                {sent.map((n) => {
                  const a = AUDIENCE[n.audience] || AUDIENCE.weak;
                  return (
                    <li key={n._id} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{n.title}</span>
                        <Badge className="bg-white/5 text-gray-400">{n.topic}</Badge>
                        <Badge className={a.cls}>{a.label}</Badge>
                        <span className="ml-auto text-xs text-gray-500">{fmt(n.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        To {n.count} student(s): {n.names.slice(0, 6).join(", ")}{n.names.length > 6 ? ` +${n.names.length - 6} more` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}