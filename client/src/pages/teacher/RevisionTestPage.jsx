import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import api, { errMsg } from "../../api/api";

const STATUS = {
  covered: ["Covered", "bg-emerald-500/15 text-emerald-300"],
  this_week: ["This week", "bg-violet-500/15 text-violet-300"],
  upcoming: ["Upcoming", "bg-white/5 text-gray-400"],
};
const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-violet-500";
const chip = "rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10";

export default function RevisionTestPage() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(20);
  const [date, setDate] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.get("/quizzes/revision/plan/" + id)
      .then((r) => {
        setPlan(r.data);
        // Pehle se tick: jo chapters parh liye (Covered / This week)
        setPicked(new Set(r.data.chapters.filter((c) => c.status !== "upcoming").map((c) => c._id)));
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  const toggle = (cid) => {
    const next = new Set(picked);
    if (next.has(cid)) next.delete(cid); else next.add(cid);
    setPicked(next);
  };
  const selectWhere = (fn) => setPicked(new Set(plan.chapters.filter(fn).map((c) => c._id)));

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/quizzes/revision/" + id, {
        moduleIds: [...picked], title, count, minutes, testDate: date || undefined, useAI,
      });
      setDone(data);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (error && !plan) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;
  if (!plan) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" />;

  const min = plan.minPerTopic || 3;
  const chosen = plan.chapters.filter((c) => picked.has(c._id));
  const topics = chosen.flatMap((c) => c.topics);
  const available = topics.reduce((s, t) => s + t.questions, 0);
  const weak = [...new Set(topics.filter((t) => t.weakStudents > 0).map((t) => t.topic))];
  const thin = [...new Set(topics.filter((t) => t.questions < min).map((t) => t.topic))];
  const canCreate = picked.size > 0 && (available > 0 || (useAI && thin.length > 0));

  if (done) {
    return (
      <div className="mx-auto mt-6 max-w-lg rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center page-enter">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
        <h1 className="mt-3 text-2xl font-bold">{done.quiz.title}</h1>
        <p className="mt-2 text-gray-300">{done.message}</p>
        <p className="mt-1 text-sm text-gray-400">📚 Covers {done.quiz.topics} topic(s)</p>
        {done.quiz.weakQuestions > 0 && <p className="mt-1 text-sm text-amber-300">🎯 {done.quiz.weakQuestions} questions from weak topics</p>}
        {done.quiz.starred > 0 && <p className="mt-1 text-sm text-yellow-300">⭐ {done.quiz.starred} important questions included</p>}
        {done.quiz.aiQuestions > 0 && <p className="mt-1 text-sm text-violet-300">✨ {done.quiz.aiQuestions} questions written by AI</p>}
        {done.note && <p className="mt-1 text-sm text-amber-300">⚠️ {done.note}</p>}
        <p className="mt-1 text-sm text-gray-400">Students and parents have been notified 🔔 Marks will show in Results.</p>
        <p className="mt-1 text-xs text-gray-500">Tip: open the test from the course page to check or edit any question.</p>
        <Link to={"/teacher/courses/" + id} className="mt-6 inline-block rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500">
          Back to {plan.course.title}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={"/teacher/courses/" + id} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> {plan.course.title}
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <ClipboardList className="text-violet-400" /> Revision Test
        </h1>
        <p className="mt-1 text-gray-400">
          Exam prep from the chapters you choose. Every topic gets questions, ⭐ important ones come first, weak topics get more. Marks count in the report card.
        </p>
      </div>

      {/* 1. Chapters */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">1. Pick chapters <span className="text-sm font-normal text-gray-500">({picked.size} of {plan.chapters.length})</span></h2>
          {plan.chapters.length > 1 && (
            <div className="flex gap-2">
              <button onClick={() => selectWhere(() => true)} className={chip}>All</button>
              <button onClick={() => selectWhere((c) => c.status === "covered")} className={chip}>Covered only</button>
              {[1, 2, 3].filter((n) => plan.chapters.some((c) => c.term === n)).map((n) => (
                <button key={n} onClick={() => selectWhere((c) => c.term === n)} className={chip}>📅 Term {n}</button>
              ))}
              <button onClick={() => setPicked(new Set())} className={chip}>None</button>
            </div>
          )}
        </div>
        {!plan.chapters.length && <p className="text-sm text-gray-500">No chapters yet. Add chapters and lessons first.</p>}
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {plan.chapters.map((c) => {
            const [label, cls] = STATUS[c.status] || STATUS.upcoming;
            const on = picked.has(c._id);
            return (
              <button key={c._id} onClick={() => toggle(c._id)}
                className={"w-full rounded-xl border p-4 text-left transition " + (on ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-black/20 hover:border-white/25")}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 font-medium">
                    <span className={"flex h-5 w-5 items-center justify-center rounded-md border text-xs " + (on ? "border-violet-400 bg-violet-500 text-white" : "border-white/20")}>{on && "✓"}</span>
                    {c.title}
                  </span>
                  <span className="flex gap-1.5">
                    {c.term && <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-300">Term {c.term}</span>}
                    <span className={"rounded-full px-2 py-0.5 text-xs " + cls}>{label}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pl-8">
                  {!c.topics.length && <span className="text-xs text-gray-500">No lesson topics yet</span>}
                  {c.topics.map((t) => (
                    <span key={t.topic} className={"rounded-full px-2 py-0.5 text-xs " + (t.weakStudents ? "bg-amber-500/15 text-amber-300" : t.questions < min ? "bg-violet-500/15 text-violet-300" : "bg-white/5 text-gray-400")}>
                      {t.topic} · {t.questions} Qs{t.weakStudents ? " · ⚠️ " + t.weakStudents + " weak" : ""}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {weak.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>Weak topics in your class: <b>{weak.join(", ")}</b>. They get extra questions, so students practise what they need most.</p>
        </div>
      )}

      {/* ✨ AI */}
      <label className={"flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm transition " + (useAI ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/[0.03]")}>
        <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-500" />
        <span>
          <span className="flex items-center gap-1.5 font-semibold text-violet-200"><Sparkles size={15} /> Let AI write missing questions</span>
          <span className="mt-0.5 block text-gray-400">
            {thin.length
              ? "These topics have fewer than " + min + " questions: " + thin.join(", ") + ". AI will write new ones for them."
              : "Every chosen topic already has enough questions. AI will only help if needed."}
          </span>
        </span>
      </label>

      {/* 2. Settings */}
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">2. Test details</h2>
        <label className="text-sm text-gray-400 md:col-span-2">
          Title (optional)
          <input className={input + " mt-1"} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Term 1 Exam Prep" />
        </label>
        <label className="text-sm text-gray-400">
          Number of questions
          <input type="number" min={3} max={50} className={input + " mt-1"} value={count} onChange={(e) => setCount(e.target.value)} />
          <span className="mt-1 block text-xs text-gray-500">
            {available} in the bank{useAI && thin.length ? " + about " + thin.length * min + " from AI" : ""} · {new Set(topics.map((t) => t.topic)).size} topics
          </span>
        </label>
        <label className="text-sm text-gray-400">
          Time (minutes)
          <input type="number" min={5} max={120} className={input + " mt-1"} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label className="text-sm text-gray-400 md:col-span-2">
          📅 Test date (optional, students and parents will see it)
          <input type="date" className={input + " mt-1"} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

      <button onClick={create} disabled={saving || !canCreate}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 font-semibold hover:opacity-90 disabled:opacity-40">
        <Sparkles size={18} /> {saving ? (useAI && thin.length ? "AI is writing questions..." : "Creating...") : "Create revision test"}
      </button>
      {!canCreate && picked.size > 0 && (
        <p className="text-center text-xs text-gray-500">No questions for these chapters. Tick ✨ AI above, or add a quiz with questions first.</p>
      )}
    </div>
  );
}