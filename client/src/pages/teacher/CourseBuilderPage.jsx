import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Rocket, Layers, PlayCircle, ClipboardList, BookMarked, CalendarDays, ArrowRight, Pencil, ClipboardCheck, FileCheck2 } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Empty, Loading, ErrorBox, ProgressBar } from "../../components/ui";
import LessonEditor from "../../components/LessonEditor";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const isRevision = (q) => q.kind === "revision" || String(q.title || "").startsWith("📝");

const STATUS = [
  { key: "upcoming", label: "Upcoming", on: "bg-white/15 text-white" },
  { key: "this_week", label: "This week", on: "bg-violet-600 text-white" },
  { key: "covered", label: "Covered", on: "bg-emerald-600 text-white" },
];

function ChapterCard({ m, index, courseId, onChange, flash }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: "", durationMinutes: "", topics: "", videoUrl: "" });

  const setStatus = async (status) => {
    try {
      await api.patch("/courses/" + courseId + "/modules/" + m._id, { status });
      onChange();
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  // 📅 Term lagao / hatao (dobara dabao to hat jaye)
  const setTerm = async (n) => {
    try {
      await api.patch("/courses/" + courseId + "/modules/" + m._id, { term: m.term === n ? null : n });
      onChange();
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  const addLesson = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const r = await api.post("/courses/" + courseId + "/modules/" + m._id + "/lessons", {
        title: form.title,
        videoUrl: form.videoUrl || undefined,
        durationMinutes: Number(form.durationMinutes) || undefined,
        topics: form.topics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setForm({ title: "", durationMinutes: "", topics: "", videoUrl: "" });
      setOpen(false);
      flash("Lesson added ✅ Now add its content ✏️");
      onChange();
      const newId = r.data?.lesson?._id || r.data?._id;
      if (newId) setEditId(newId);
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="font-semibold"><span className="text-violet-400">Chapter {index + 1}:</span> {m.title}</h3>
        <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-black/30 p-1 text-xs" title="Which term is this chapter in?">
          {[1, 2, 3].map((n) => (
            <button key={n} onClick={() => setTerm(n)}
              className={"rounded-lg px-2.5 py-1.5 font-medium transition " + (m.term === n ? "bg-cyan-600 text-white" : "text-gray-500 hover:text-white")}>
              T{n}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl bg-black/30 p-1 text-xs">
          {STATUS.map((s) => (
            <button key={s.key} onClick={() => setStatus(s.key)}
              className={"rounded-lg px-3 py-1.5 font-medium transition " + (m.status === s.key ? s.on : "text-gray-400 hover:text-white")}>
              {s.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      <ul className="mt-4 space-y-1">
        {!m.lessons.length && <p className="text-sm text-gray-500">No lessons yet. Students see "Lessons coming soon".</p>}
        {m.lessons.map((l) => (
          <li key={l._id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/5">
            <PlayCircle size={16} className="shrink-0 text-violet-400" />
            <span className="flex-1">{l.title}</span>
            {(l.topics || []).map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">{t}</span>)}
            {l.durationMinutes && <span className="text-xs text-gray-500">{l.durationMinutes} min</span>}
            <button onClick={() => setEditId(l._id)} title="Edit lesson"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-violet-300 hover:bg-violet-500/15">
              <Pencil size={13} /> Edit
            </button>
          </li>
        ))}
      </ul>

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
          <Plus size={14} /> Add lesson
        </button>
      ) : (
        <form onSubmit={addLesson} className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-2 page-enter">
          <input className={input} placeholder="Lesson title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className={input} placeholder="Topic(s): Fractions" value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
          <input className={input} placeholder="YouTube link (optional)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
          <input className={input} type="number" min="1" placeholder="Minutes, e.g. 15" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          <p className="text-xs text-gray-500 md:col-span-2">Next step: write the content yourself, or let ✨ AI draft it.</p>
          {err && <p className="text-sm text-rose-300 md:col-span-2">{err}</p>}
          <div className="flex gap-2 md:col-span-2">
            <button disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">{saving ? "Saving..." : "Save and add content"}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {editId && (
        <LessonEditor lessonId={editId} courseId={courseId} onClose={() => setEditId(null)}
          onSaved={() => { flash("Lesson saved ✅"); onChange(); }} />
      )}
    </Card>
  );
}

function QuizzesCard({ courseId, quizzes, flash }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", timeLimitMinutes: 10, questionsPerAttempt: 5, testDate: "" });

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post("/quizzes", {
        courseId, title: form.title,
        timeLimitMinutes: Number(form.timeLimitMinutes), questionsPerAttempt: Number(form.questionsPerAttempt),
        testDate: form.testDate || undefined,
      });
      navigate("/teacher/quizzes/" + r.data.quiz._id);
    } catch (e2) {
      flash(errMsg(e2), true);
      setSaving(false);
    }
  };

  return (
    <Card title="Quizzes" icon={ClipboardList}
      action={<button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200"><Plus size={14} /> New quiz</button>}>
      {open && (
        <form onSubmit={create} className="mb-4 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 page-enter">
          <input className={input} placeholder="Quiz title, e.g. Chapter 1 Quiz" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-400">Minutes
              <input className={input + " mt-1"} type="number" min="1" value={form.timeLimitMinutes} onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value })} />
            </label>
            <label className="text-xs text-gray-400">Questions per try
              <input className={input + " mt-1"} type="number" min="1" value={form.questionsPerAttempt} onChange={(e) => setForm({ ...form, questionsPerAttempt: e.target.value })} />
            </label>
          </div>
          <label className="block text-xs text-gray-400">📅 Test date (optional, students and parents get notified)
            <input className={input + " mt-1"} type="date" value={form.testDate} onChange={(e) => setForm({ ...form, testDate: e.target.value })} />
          </label>
          <button disabled={saving} className="w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">
            {saving ? "Creating..." : "Create quiz and add questions"}
          </button>
        </form>
      )}

      {!quizzes.length ? (
        <Empty text="No quizzes yet." />
      ) : (
        <ul className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {quizzes.map((q) => {
            const rev = isRevision(q);
            return (
              <li key={q._id}>
                <Link to={"/teacher/quizzes/" + q._id}
                  className={"flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition " + (rev ? "border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15" : "bg-black/20 hover:bg-white/5")}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{q.title}</p>
                    <p className="text-xs text-gray-500">
                      {rev && <span className="mr-1 text-amber-300">Revision ·</span>}
                      {q.questionsPerAttempt} Qs · {q.timeLimitMinutes} min
                      {q.testDate && <span className="ml-1 text-amber-300"><CalendarDays size={11} className="inline" /> {fmtDate(q.testDate)}</span>}
                    </p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-gray-500" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* 📝 Revision test: exam prep, marks count in report card */}
      <Link to={"/teacher/courses/" + courseId + "/revision"}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20">
        <FileCheck2 size={16} /> 📝 Revision test
      </Link>
      <p className="mt-1.5 text-center text-[11px] text-gray-500">Exam prep from chosen chapters · weak topics get more questions</p>
    </Card>
  );
}

export default function CourseBuilderPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [chapter, setChapter] = useState("");
  const [busy, setBusy] = useState(false);
  const [termFilter, setTermFilter] = useState(0);

  const load = useCallback(() => {
    api.get("/courses/" + id).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const flash = (text, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 3500);
  };

  const addChapter = async (e) => {
    e.preventDefault();
    if (!chapter.trim()) return;
    try {
      await api.post("/courses/" + id + "/modules", { title: chapter.trim() });
      setChapter("");
      flash("Chapter added ✅");
      load();
    } catch (e2) {
      flash(errMsg(e2), true);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const r = await api.patch("/courses/" + id + "/publish");
      flash(r.data.message);
      load();
    } catch (e) {
      flash(errMsg(e), true);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;

  const { course, modules, quizzes, lessonCount } = data;
  const covered = modules.filter((m) => m.status === "covered").length;
  const syllabus = modules.length ? Math.round((covered / modules.length) * 100) : 0;
  const published = course.status === "published";

  return (
    <div className="space-y-6">
      <Link to="/teacher/courses" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> My Courses
      </Link>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <Badge className={published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-gray-300"}>{published ? "Published" : "Draft"}</Badge>
            </div>
            {course.description && <p className="mt-1 text-gray-400">{course.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {course.topics.map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400">{t}</span>)}
            </div>
            {!published && <p className="mt-3 text-xs text-amber-300">⚠️ Students can't see this course until you publish it.</p>}
          </div>
          {!published && (
            <button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              <Rocket size={16} /> {busy ? "Publishing..." : "Publish course"}
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-black/20 p-3 text-sm"><span className="text-gray-400">Chapters</span><p className="text-xl font-bold">{modules.length}</p></div>
          <div className="rounded-xl bg-black/20 p-3 text-sm"><span className="text-gray-400">Lessons</span><p className="text-xl font-bold">{lessonCount}</p></div>
          <div className="rounded-xl bg-black/20 p-3 text-sm">
            <div className="mb-1 flex justify-between"><span className="text-gray-400">Syllabus covered</span><span className="font-semibold">{syllabus}%</span></div>
            <ProgressBar value={syllabus} />
          </div>
        </div>
      </Card>

      {msg && (
        <div className={"page-enter rounded-xl border px-4 py-3 text-sm " + (msg.bad ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2 stagger">
          {!modules.length && <Card><Empty text="Start by adding your first chapter 👇" /></Card>}
          {modules.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">📅 Show:</span>
              {[0, 1, 2, 3].map((n) => (
                <button key={n} onClick={() => setTermFilter(n)}
                  className={"rounded-full px-3 py-1 font-medium transition " + (termFilter === n ? "bg-cyan-600 text-white" : "bg-white/5 text-gray-400 hover:text-white")}>
                  {n ? "Term " + n + " (" + modules.filter((m) => m.term === n).length + ")" : "All"}
                </button>
              ))}
              <span className="text-gray-600">· Tap T1 / T2 / T3 on a chapter to set its term</span>
            </div>
          )}
          {modules.map((m, i) => (!termFilter || m.term === termFilter) && (
            <ChapterCard key={m._id} m={m} index={i} courseId={id} onChange={load} flash={flash} />
          ))}
          <form onSubmit={addChapter} className="flex gap-2">
            <input className={input} placeholder="New chapter title, e.g. Fractions" value={chapter} onChange={(e) => setChapter(e.target.value)} />
            <button className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold hover:bg-violet-500">
              <Plus size={16} /> Chapter
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <QuizzesCard courseId={id} quizzes={quizzes} flash={flash} />

          {/* 📝 Assignments shortcut */}
          <Card title="Assignments" icon={ClipboardCheck}>
            <p className="text-sm text-gray-400">Give homework for this course, then check it with marks and feedback.</p>
            <Link to="/teacher/grading" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
              <Plus size={14} /> Give an assignment
            </Link>
          </Card>

          <Card title="How it works" icon={BookMarked}>
            <ol className="space-y-2 text-sm text-gray-400">
              <li><Layers size={14} className="mr-1 inline text-violet-400" /> 1. Add chapters</li>
              <li><PlayCircle size={14} className="mr-1 inline text-violet-400" /> 2. Add lessons, then ✏️ Edit or ✨ AI for content</li>
              <li><ClipboardList size={14} className="mr-1 inline text-violet-400" /> 3. Add a quiz and its questions</li>
              <li><Rocket size={14} className="mr-1 inline text-violet-400" /> 4. Publish. Students see it instantly</li>
              <li>📝 Before exams, make a <b className="text-white">Revision test</b> from covered chapters</li>
              <li>📚 Mark chapters <b className="text-white">This week</b> / <b className="text-white">Covered</b> as you teach</li>
              <li>📅 Tag each chapter <b className="text-white">T1 / T2 / T3</b> to plan terms and term exams</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}