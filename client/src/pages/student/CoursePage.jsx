import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Award, CheckCircle2, ClipboardList, FileText, Lock, PlayCircle, UserRound, Layers, HelpCircle, ArrowRight,
  Camera, X, Paperclip,
} from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { prepareUpload } from "../../utils/upload";
import { coverFor } from "./CoursesPage";

const msg = (e) => e.response?.data?.message || "Something went wrong";
const arr = (d, k) => (Array.isArray(d?.[k]) ? d[k] : Array.isArray(d) ? d : []);
const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";
const field = "w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-white outline-none focus:border-violet-500/60";

function AssignmentItem({ a, sub, onDone, isSchool }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(false);

  const overdue = a.dueDate && new Date(a.dueDate) < new Date();
  const [label, color] =
    sub?.status === "graded" ? ["Graded", "bg-emerald-500/15 text-emerald-300"]
    : sub ? ["Submitted", "bg-sky-500/15 text-sky-300"]
    : overdue ? ["Overdue", "bg-rose-500/15 text-rose-300"]
    : ["Pending", "bg-amber-500/15 text-amber-300"];
  const marks = sub?.marks ?? sub?.score;
  const max = a.maxMarks ?? a.totalMarks;

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    setReading(true);
    try {
      setFile(await prepareUpload(f));
    } catch (x) {
      setErr(x.message);
    } finally {
      setReading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !fileUrl.trim() && !file) {
      return setErr(isSchool ? "Please add a photo of your work 📷" : "Write an answer, add a link or a file");
    }
    setSaving(true);
    setErr("");
    try {
      await api.post(`/assignments/${a._id}/submissions`, {
        content, fileUrl,
        attachment: file?.data, attachmentName: file?.name, attachmentType: file?.type,
      });
      setOpen(false);
      setFile(null);
      onDone();
    } catch (e2) {
      setErr(msg(e2));
    } finally {
      setSaving(false);
    }
  };

  const uploadBox = (
    <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-500/40 bg-violet-500/5 px-3 text-center transition hover:bg-violet-500/10 ${isSchool ? "py-6" : "py-3"}`}>
      <Camera className={`${isSchool ? "h-7 w-7" : "h-5 w-5"} text-violet-300`} />
      <span className="text-sm font-semibold text-white">
        {reading ? "Preparing..." : isSchool ? "Take a photo or upload" : "Upload a photo or PDF (optional)"}
      </span>
      <span className="text-[11px] text-slate-500">Photo or PDF · max 4 MB</span>
      <input type="file" accept="image/*,application/pdf" onChange={pick} className="hidden" />
    </label>
  );

  const preview = file && (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
      {file.type.startsWith("image/") ? (
        <img src={file.data} alt="" className="h-14 w-14 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-500/15 text-xs font-bold text-rose-300">PDF</div>
      )}
      <span className="flex-1 truncate text-sm text-slate-300">{file.name}</span>
      <button type="button" onClick={() => setFile(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{a.title}</p>
          {a.dueDate && (
            <p className="text-xs text-slate-500">
              Due {new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
      </div>
      {a.description && <p className="mt-2 text-sm text-slate-400">{a.description}</p>}

      {/* 🖼️ Teacher ki picture: dekh kar kaam karo */}
      {a.image && (
        <button type="button" onClick={() => setZoom(true)} className="mt-3 block w-full overflow-hidden rounded-xl border border-white/10 bg-white transition hover:opacity-90">
          <img src={a.image} alt={a.imageCaption || a.title} className="mx-auto max-h-56 w-auto object-contain" />
        </button>
      )}
      {a.image && <p className="mt-1 text-[11px] text-slate-500">🔍 Tap the picture to make it bigger{a.imageCaption ? " · " + a.imageCaption : ""}</p>}
      {zoom && createPortal(
        <div onClick={() => setZoom(false)} className="bg-black/85 p-4"
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={a.image} alt="" className="max-h-full max-w-full rounded-xl bg-white shadow-2xl" />
          <button onClick={() => setZoom(false)} className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>,
        document.body
      )}

      {sub?.attachmentName && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-sky-300"><Paperclip className="h-3.5 w-3.5" /> {sub.attachmentName}</p>
      )}

      {sub?.status === "graded" && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm">
          <p className="font-semibold text-emerald-300">Marks: {marks}{max ? ` / ${max}` : ""}</p>
          {sub.feedback && <p className="mt-1 italic text-slate-300">"{sub.feedback}"</p>}
        </div>
      )}

      {!open && !sub && (
        <button onClick={() => setOpen(true)} className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500">
          Submit work
        </button>
      )}
      {!open && sub && sub.status !== "graded" && (
        <button onClick={() => setOpen(true)} className="mt-3 text-xs text-violet-300 hover:text-violet-200">
          ✏️ Change my work (before the teacher checks it)
        </button>
      )}

      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2 page-enter">
          {isSchool ? (
            <>
              {uploadBox}
              {preview}
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} placeholder="Note for your teacher (optional)" className={field} />
            </>
          ) : (
            <>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Your answer or notes..." className={field} />
              <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="Link (GitHub, Google Drive) - optional" className={field} />
              {uploadBox}
              {preview}
            </>
          )}
          {err && <p className="text-xs text-rose-300">{err}</p>}
          <div className="flex gap-2">
            <button disabled={saving || reading} className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
              {saving ? "Submitting..." : "Submit"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setFile(null); setErr(""); }} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CoursePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { organization } = useAuth();
  const isSchool = organization?.type === "school";
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [termFilter, setTermFilter] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/courses/${id}`);
      setData(r.data);
      if (r.data.enrollment) {
        const [a, s] = await Promise.all([
          api.get(`/assignments?courseId=${id}`).catch(() => ({ data: [] })),
          api.get("/submissions/me").catch(() => ({ data: [] })),
        ]);
        setAssignments(arr(a.data, "assignments"));
        setSubs(arr(s.data, "submissions"));
      }
    } catch (e) {
      setError(msg(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const enroll = async () => {
    setBusy(true);
    try {
      await api.post(`/courses/${id}/enroll`);
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-white/5" />;

  const { course, modules, quizzes, enrollment, lessonCount } = data;
  const done = new Set((enrollment?.completedLessons || []).map(String));
  const all = modules.flatMap((m) => m.lessons);
  const next = all.find((l) => !done.has(String(l._id))) || all[0];
  const completed = enrollment?.status === "completed";

  return (
    <div className="space-y-6">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${coverFor(course._id)} p-6 md:p-8`}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <Link to="/student/courses" className="mb-4 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>
        <h1 className="text-3xl font-bold text-white">{course.title}</h1>
        {course.description && <p className="mt-2 max-w-2xl text-white/85">{course.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {course.topics.map((t) => <span key={t} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white">{t}</span>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm text-white/85">
          <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4" />{course.instructorId?.name}</span>
          <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" />{lessonCount} lessons</span>
          <span className="flex items-center gap-1.5"><HelpCircle className="h-4 w-4" />{quizzes.length} quizzes</span>
        </div>

        <div className="mt-6">
          {!enrollment ? (
            <button onClick={enroll} disabled={busy} className="rounded-xl bg-white px-5 py-2.5 font-semibold text-slate-900 shadow-lg transition hover:scale-[1.02] disabled:opacity-60">
              {busy ? "Enrolling..." : "Enroll for free"}
            </button>
          ) : (
            <div className="max-w-md space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm text-white/90"><span>Your progress</span><span>{enrollment.progressPercent}%</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${enrollment.progressPercent}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {next && (
                  <button onClick={() => nav(`/student/lessons/${next._id}`)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-slate-900 transition hover:scale-[1.02]">
                    {completed ? "Review lessons" : enrollment.progressPercent ? "Continue" : "Start learning"} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {completed && (
                  <button onClick={() => nav(`/student/courses/${id}/certificate`)} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 transition hover:scale-[1.02]">
                    <Award className="h-4 w-4" /> View certificate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="stagger space-y-4 lg:col-span-2">
          {modules.length === 0 && <div className={`${box} text-slate-400`}>Lessons are coming soon.</div>}
          {modules.some((m) => m.term) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {[0, 1, 2, 3].filter((n) => !n || modules.some((m) => m.term === n)).map((n) => (
                <button key={n} onClick={() => setTermFilter(n)}
                  className={`rounded-full px-3 py-1 font-medium transition ${termFilter === n ? "bg-cyan-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
                  {n ? `📅 Term ${n}` : "All terms"}
                </button>
              ))}
            </div>
          )}
          {modules.filter((m) => !termFilter || m.term === termFilter).map((m) => (
            <div key={m._id} className={box}>
              <h3 className="mb-3 flex items-center justify-between gap-2 font-semibold text-white">
                {m.title}
                {m.term && <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-300">Term {m.term}</span>}
              </h3>
              <div className="space-y-1">
                {m.lessons.length === 0 && (
                  <p className="rounded-lg bg-white/[0.02] px-3 py-2 text-sm text-slate-500">📚 Lessons coming soon</p>
                )}
                {m.lessons.map((l) => {
                  const isDone = done.has(String(l._id));
                  const Icon = isDone ? CheckCircle2 : enrollment ? PlayCircle : Lock;
                  const row = (
                    <>
                      <Icon className={`h-5 w-5 shrink-0 ${isDone ? "text-emerald-400" : enrollment ? "text-violet-400" : "text-slate-600"}`} />
                      <span className="flex-1 text-sm">{l.title}</span>
                      {l.durationMinutes && <span className="text-xs text-slate-500">{l.durationMinutes} min</span>}
                    </>
                  );
                  return enrollment ? (
                    <Link key={l._id} to={`/student/lessons/${l._id}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-200 transition hover:bg-white/5">{row}</Link>
                  ) : (
                    <div key={l._id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-500">{row}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className={box}>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-white"><ClipboardList className="h-4 w-4 text-violet-400" /> Quizzes</h3>
            {quizzes.length === 0 && <p className="text-sm text-slate-500">No quizzes yet.</p>}
            <div className="space-y-2">
              {quizzes.map((q) => (
                <div key={q._id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{q.title}</p>
                    <p className="text-xs text-slate-500">
                      {q.questionsPerAttempt ? `${q.questionsPerAttempt} questions` : "Quiz"}{q.timeLimitMinutes ? ` • ${q.timeLimitMinutes} min` : ""}
                    </p>
                  </div>
                  <button disabled={!enrollment} onClick={() => nav(`/student/quiz/${q._id}`)}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
                    Start
                  </button>
                </div>
              ))}
            </div>
            {!enrollment && quizzes.length > 0 && <p className="mt-2 text-xs text-slate-500">Enroll to unlock quizzes.</p>}
          </div>

          {enrollment && (
            <div className={box}>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-white"><FileText className="h-4 w-4 text-violet-400" /> Assignments</h3>
              {assignments.length === 0 && <p className="text-sm text-slate-500">No assignments yet.</p>}
              <div className="space-y-3">
                {assignments.map((a) => (
                  <AssignmentItem key={a._id} a={a} onDone={load} isSchool={isSchool}
                    sub={subs.find((s) => String(s.assignmentId?._id || s.assignmentId) === String(a._id))} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}