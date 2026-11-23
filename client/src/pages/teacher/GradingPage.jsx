import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardCheck, Plus, X, ChevronDown, ExternalLink, Clock, FileText, Camera, Sparkles, ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Empty, Loading, ErrorBox } from "../../components/ui";
import { openFile, prepareUpload } from "../../utils/upload";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// 🔍 Photo badi karke dekhna
function Lightbox({ src, onClose }) {
  return createPortal(
    <div className="bg-black/85 p-4" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={src} alt="Student work" className="max-h-full max-w-full rounded-xl shadow-2xl" />
      <button onClick={onClose} className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={20} /></button>
    </div>,
    document.body
  );
}

function GradeRow({ s, max, onDone, flash }) {
  const [marks, setMarks] = useState(s.marks ?? "");
  const [feedback, setFeedback] = useState(s.feedback || "");
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(false);
  const isImage = s.attachment && s.attachmentType?.startsWith("image/");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.patch(`/submissions/${s._id}/grade`, { marks: Number(marks), feedback });
      flash(r.data.message);
      onDone();
    } catch (e2) {
      flash(errMsg(e2), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{s.studentId?.name}</span>
        {s.isLate && <Badge className="bg-rose-500/15 text-rose-300"><Clock size={11} /> Late</Badge>}
        <Badge className={s.status === "graded" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}>
          {s.status === "graded" ? `Graded ${s.marks}/${max}` : "Needs grading"}
        </Badge>
        <span className="ml-auto text-xs text-gray-500">{fmt(s.updatedAt || s.createdAt)}</span>
      </div>

      {isImage && (
        <button type="button" onClick={() => setZoom(true)} className="mt-3 block overflow-hidden rounded-xl border border-white/10 transition hover:opacity-90">
          <img src={s.attachment} alt="Student work" className="max-h-64 w-auto object-contain" />
        </button>
      )}
      {s.attachment && !isImage && (
        <button type="button" onClick={() => openFile(s.attachment)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/25">
          <FileText size={16} /> Open PDF · {s.attachmentName}
        </button>
      )}

      {s.content && <p className="mt-2 whitespace-pre-line rounded-lg bg-white/[0.03] p-3 text-sm text-gray-300">{s.content}</p>}
      {s.fileUrl && (
        <a href={s.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-violet-300 hover:underline">
          <ExternalLink size={14} /> Open link
        </a>
      )}
      <form onSubmit={save} className="mt-3 flex flex-col gap-2 md:flex-row">
        <input className={`${input} md:w-28`} type="number" min="0" max={max} placeholder={`/ ${max}`} value={marks} onChange={(e) => setMarks(e.target.value)} required />
        <input className={input} placeholder="Feedback, e.g. Good work, label the roots too" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <button disabled={saving} className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
          {saving ? "Saving..." : s.status === "graded" ? "Update" : "Save grade"}
        </button>
      </form>

      {zoom && <Lightbox src={s.attachment} onClose={() => setZoom(false)} />}
    </li>
  );
}

function Submissions({ assignment, onChanged, flash }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    api.get(`/assignments/${assignment._id}/submissions`).then((r) => setData(r.data)).catch((e) => flash(errMsg(e), true));
  }, [assignment._id, flash]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="mt-4 h-20 animate-pulse rounded-xl bg-white/5" />;
  return (
    <div className="mt-4 space-y-3 page-enter">
      {!data.submissions.length ? <Empty text="No submissions yet." /> : (
        <ul className="space-y-3">
          {data.submissions.map((s) => (
            <GradeRow key={s._id} s={s} max={assignment.maxMarks} flash={flash} onDone={() => { load(); onChanged(); }} />
          ))}
        </ul>
      )}
      {data.notSubmitted.length > 0 && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">⏳ Not submitted yet: {data.notSubmitted.join(", ")}</p>
      )}
    </div>
  );
}

// 🖼️ Assignment ki picture: 📷 apni photo ya ✨ AI diagram
function PicturePicker({ courseId, value, onChange }) {
  const [mode, setMode] = useState("photo");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Please choose a photo (JPG or PNG)");
    setErr("");
    setBusy(true);
    try {
      const up = await prepareUpload(f);
      onChange({ image: up.data, imageKind: "photo", imageCaption: "" });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const draw = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await api.post("/diagram", { courseId, prompt });
      onChange({ image: r.data.image, imageKind: "diagram", imageCaption: r.data.caption });
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const tab = (k, Icon, label) => (
    <button type="button" onClick={() => { setMode(k); setErr(""); }}
      className={"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition " + (mode === k ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:text-white")}>
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><ImageIcon size={16} className="text-violet-400" /> Picture for students <span className="font-normal text-gray-500">(optional, great for Grade 1-5)</span></p>
        <div className="flex gap-2">{tab("photo", Camera, "My photo")}{tab("ai", Sparkles, "AI diagram")}</div>
      </div>

      {value?.image ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
            <img src={value.image} alt="Assignment" className="mx-auto max-h-72 w-auto object-contain" />
          </div>
          {value.imageCaption && <p className="text-xs text-gray-400">🖼️ {value.imageCaption}</p>}
          <div className="flex gap-2">
            {value.imageKind === "diagram" && (
              <button type="button" onClick={draw} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-50">
                <RefreshCw size={13} /> {busy ? "Drawing..." : "Draw again"}
              </button>
            )}
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">
              <X size={13} /> Remove picture
            </button>
          </div>
        </div>
      ) : mode === "photo" ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-500/40 bg-violet-500/5 py-6 text-center transition hover:bg-violet-500/10">
          <Camera className="h-7 w-7 text-violet-300" />
          <span className="text-sm font-semibold">{busy ? "Preparing..." : "Upload a photo (worksheet, book page, drawing)"}</span>
          <span className="text-[11px] text-gray-500">JPG or PNG · max 4 MB</span>
          <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        </label>
      ) : (
        <div className="space-y-2">
          <textarea className={input} rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the picture, e.g. A pizza cut into 4 equal parts with 1 part coloured, labelled 1/4" />
          <div className="flex flex-wrap gap-2 text-[11px]">
            {["A pizza cut into 4 equal parts, 1 part shaded, label 1/4", "Parts of a plant: root, stem, leaf, flower", "A computer with monitor, keyboard, mouse and CPU labelled"].map((s) => (
              <button type="button" key={s} onClick={() => setPrompt(s)} className="rounded-full bg-white/5 px-2.5 py-1 text-gray-400 hover:bg-white/10 hover:text-white">{s}</button>
            ))}
          </div>
          <button type="button" onClick={draw} disabled={busy || prompt.trim().length < 3}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            <Sparkles size={15} /> {busy ? "AI is drawing..." : "Draw with AI"}
          </button>
        </div>
      )}
      {err && <p className="text-xs text-rose-300">{err}</p>}
    </div>
  );
}

export default function GradingPage() {
  const [courses, setCourses] = useState(null);
  const [cid, setCid] = useState("");
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", topic: "", dueDate: "", maxMarks: 10 });
  const [pic, setPic] = useState(null);
  const [creating, setCreating] = useState(false);
  const [askDel, setAskDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/courses?mine=true")
      .then((r) => { setCourses(r.data.courses); if (r.data.courses[0]) setCid(r.data.courses[0]._id); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const loadList = useCallback(() => {
    if (!cid) return;
    api.get(`/assignments?courseId=${cid}`).then((r) => setList(r.data.assignments)).catch((e) => setError(errMsg(e)));
  }, [cid]);
  useEffect(() => { setList(null); setOpen(null); loadList(); }, [loadList]);

  const flash = useCallback((text, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 3500);
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await api.post("/assignments", { ...form, ...(pic || {}), courseId: cid, maxMarks: Number(form.maxMarks) });
      flash(r.data.message);
      setForm({ title: "", description: "", topic: "", dueDate: "", maxMarks: 10 });
      setPic(null);
      setShowForm(false);
      loadList();
    } catch (e2) {
      flash(errMsg(e2), true);
    } finally {
      setCreating(false);
    }
  };

  // 🗑️ Ghalti se bana assignment hatana
  const remove = async (id) => {
    setDeleting(true);
    try {
      const r = await api.delete(`/assignments/${id}`);
      flash(r.data.message);
      setAskDel(null);
      if (open === id) setOpen(null);
      loadList();
    } catch (e2) {
      flash(errMsg(e2), true);
      setAskDel(null);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <ErrorBox text={error} />;
  if (!courses) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assignments & Grading</h1>
          <p className="mt-1 text-gray-400">Give work, check it, and send feedback. Students and parents are notified.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} disabled={!cid}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Close" : "New assignment"}
        </button>
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

      {showForm && (
        <Card title="New assignment" icon={Plus} className="page-enter">
          <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
            <input className={input} placeholder="Title, e.g. Draw a plant at home" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className={input} placeholder="Topic (optional), e.g. Plants" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <textarea className={`${input} md:col-span-2`} rows={3} placeholder="What should students do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="text-xs text-gray-400">Due date
              <input className={`${input} mt-1`} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </label>
            <label className="text-xs text-gray-400">Total marks
              <input className={`${input} mt-1`} type="number" min="1" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
            </label>
            <PicturePicker courseId={cid} value={pic} onChange={setPic} />
            <button disabled={creating} className="rounded-xl bg-violet-600 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50 md:col-span-2">
              {creating ? "Creating..." : "Create and notify students"}
            </button>
          </form>
        </Card>
      )}

      {!list ? <Loading /> : !list.length ? (
        <Card><Empty text="No assignments in this course yet." /></Card>
      ) : (
        <div className="space-y-4 stagger">
          {list.map((a) => {
            const toGrade = a.submitted - a.graded;
            const isOpen = open === a._id;
            return (
              <Card key={a._id}>
                <div role="button" tabIndex={0} onClick={() => setOpen(isOpen ? null : a._id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setOpen(isOpen ? null : a._id); }}
                  className="flex w-full cursor-pointer flex-col gap-3 text-left md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                  {a.image && <img src={a.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={18} className="text-violet-400" />
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.topic && <Badge className="bg-white/5 text-gray-400">{a.topic}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Due {fmt(a.dueDate)} · {a.maxMarks} marks{a.image ? (a.imageKind === "diagram" ? " · ✨ AI diagram" : " · 🖼️ photo") : ""}</p>
                  </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className="bg-sky-500/15 text-sky-300">{a.submitted}/{a.students} submitted</Badge>
                    {toGrade > 0 ? <Badge className="bg-amber-500/15 text-amber-300">{toGrade} to grade</Badge> : <Badge className="bg-emerald-500/15 text-emerald-300">All graded</Badge>}
                    {askDel === a._id ? (
                      <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-rose-200">
                        Delete?
                        <button type="button" disabled={deleting} onClick={() => remove(a._id)} className="rounded-md bg-rose-600 px-2 py-0.5 font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                          {deleting ? "..." : "Yes"}
                        </button>
                        <button type="button" onClick={() => setAskDel(null)} className="rounded-md bg-white/10 px-2 py-0.5 hover:bg-white/20">No</button>
                      </span>
                    ) : (
                      <button type="button" title="Delete assignment" onClick={(e) => { e.stopPropagation(); setAskDel(a._id); }}
                        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-rose-500/10 hover:text-rose-300">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>
                {isOpen && <Submissions assignment={a} onChanged={loadList} flash={flash} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}