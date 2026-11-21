import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Star, Trash2, Settings, ListChecks, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Empty, Loading, ErrorBox } from "../../components/ui";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const LETTERS = ["A", "B", "C", "D"];
const NEEDED = 9;
const EMPTY = { text: "", options: ["", "", "", ""], correctIndex: 0, topic: "", important: false };
const LEVELS = ["easy", "medium", "hard"];

function AIPanel({ quizId, lessons, topics, onAdded, flash }) {
  const [src, setSrc] = useState(lessons.length ? "lesson" : "topic");
  const [topic, setTopic] = useState(topics[0] || "");
  const [lessonId, setLessonId] = useState(lessons[0]?._id || "");
  const [level, setLevel] = useState("medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState([]);

  const generate = async () => {
    setLoading(true);
    setDrafts([]);
    try {
      const r = await api.post(`/quizzes/${quizId}/generate`, {
        source: src, topic: src === "topic" ? topic : undefined, lessonId: src === "lesson" ? lessonId : undefined,
        level, count: Number(count),
      });
      setDrafts(r.data.questions.map((q) => ({ ...q, keep: true, important: false })));
      flash(r.data.message + (r.data.usedVideo ? " 🎬 Video included." : ""));
    } catch (e) {
      flash(errMsg(e), true);
    } finally {
      setLoading(false);
    }
  };

  const update = (i, patch) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const addSelected = async () => {
    const chosen = drafts.filter((d) => d.keep);
    if (!chosen.length) return flash("Tick at least one question", true);
    setAdding(true);
    try {
      const r = await api.post(`/quizzes/${quizId}/questions`, {
        questions: chosen.map(({ text, options, correctIndex, topic: t, important }) => ({ text, options, correctIndex, topic: t, important })),
      });
      flash(r.data.message);
      setDrafts([]);
      onAdded();
    } catch (e) {
      flash(errMsg(e), true);
    } finally {
      setAdding(false);
    }
  };

  const kept = drafts.filter((d) => d.keep).length;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-400/40 p-[1px]">
      <div className="rounded-2xl bg-[#12122a] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-fuchsia-300" />
          <h3 className="font-semibold">Generate with AI</h3>
          <Badge className="bg-fuchsia-500/15 text-fuchsia-300">You approve every question</Badge>
        </div>

        <div className="mb-3 flex rounded-xl bg-black/30 p-1 text-sm">
          {[["lesson", "From a lesson"], ["topic", "Topic + level"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setSrc(k)} disabled={k === "lesson" && !lessons.length}
              className={`flex-1 rounded-lg px-3 py-1.5 font-medium transition disabled:opacity-40 ${src === k ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {src === "lesson" ? (
            <select className={input} value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              {lessons.map((l) => <option key={l._id} value={l._id} className="bg-[#12122a]">{l.title}{l.videoUrl ? " 🎬" : ""}</option>)}
            </select>
          ) : (
            <>
              <input className={input} list="ai-topics" placeholder="Topic, e.g. HTML tags" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <datalist id="ai-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
            </>
          )}
          <div className="flex gap-2">
            <div className="flex flex-1 rounded-xl bg-black/30 p-1 text-xs">
              {LEVELS.map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)}
                  className={`flex-1 rounded-lg py-1.5 font-medium capitalize transition ${level === l ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"}`}>
                  {l}
                </button>
              ))}
            </div>
            <input className={`${input} w-20`} type="number" min="1" max="10" value={count} onChange={(e) => setCount(e.target.value)} title="How many" />
          </div>
        </div>

        <button type="button" onClick={generate} disabled={loading || (src === "topic" && !topic.trim())}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {loading ? <><Loader2 size={16} className="animate-spin" /> AI is writing questions...</> : <><Sparkles size={16} /> Generate {count} questions</>}
        </button>

        {drafts.length > 0 && (
          <div className="mt-5 space-y-3 page-enter">
            <p className="text-xs text-gray-400">Untick anything you don't like. Tap an option to change the correct answer.</p>
            {drafts.map((d, i) => (
              <div key={i} className={`rounded-xl border p-4 transition ${d.keep ? "border-white/10 bg-black/20" : "border-white/5 opacity-40"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={d.keep} onChange={() => update(i, { keep: !d.keep })} className="mt-1 h-4 w-4 accent-violet-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i + 1}. {d.text}</p>
                    <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                      {d.options.map((o, k) => (
                        <button key={k} type="button" onClick={() => update(i, { correctIndex: k })}
                          className={`rounded-lg px-2.5 py-1.5 text-left text-sm transition ${k === d.correctIndex ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}>
                          {k === d.correctIndex ? "✓" : LETTERS[k] + "."} {o}
                        </button>
                      ))}
                    </div>
                    {d.explanation && <p className="mt-2 text-xs text-gray-500">💡 {d.explanation}</p>}
                  </div>
                  <button type="button" onClick={() => update(i, { important: !d.important })} title="Important" className="rounded-lg p-1.5 text-gray-400 hover:text-amber-300">
                    <Star size={16} className={d.important ? "fill-amber-300 text-amber-300" : ""} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSelected} disabled={adding || !kept}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
              <CheckCircle2 size={16} /> {adding ? "Adding..." : `Add ${kept} selected to question bank`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [settings, setSettings] = useState(null);
  const [q, setQ] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get(`/quizzes/${id}/questions`)
      .then((r) => {
        setData(r.data);
        const qz = r.data.quiz;
        setSettings({
          title: qz.title, timeLimitMinutes: qz.timeLimitMinutes, questionsPerAttempt: qz.questionsPerAttempt,
          testDate: qz.testDate ? qz.testDate.slice(0, 10) : "",
        });
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const flash = (text, bad = false) => {
    setMsg({ text, bad });
    setTimeout(() => setMsg(null), 4000);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const r = await api.patch(`/quizzes/${id}`, {
        title: settings.title,
        timeLimitMinutes: Number(settings.timeLimitMinutes),
        questionsPerAttempt: Number(settings.questionsPerAttempt),
        testDate: settings.testDate || null,
      });
      flash(r.data.message);
      load();
    } catch (e2) {
      flash(errMsg(e2), true);
    }
  };

  const deleteQuiz = async () => {
    if (!window.confirm("Delete this whole quiz and its questions?")) return;
    try {
      const r = await api.delete(`/quizzes/${id}`);
      navigate(`/teacher/courses/${r.data.courseId}`);
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    if (q.options.some((o) => !o.trim())) return flash("Please fill all 4 options", true);
    setSaving(true);
    try {
      const r = await api.post(`/quizzes/${id}/questions`, {
        questions: [{ ...q, text: q.text.trim(), topic: q.topic.trim(), options: q.options.map((o) => o.trim()) }],
      });
      flash(r.data.message);
      setQ({ ...EMPTY, topic: q.topic });
      load();
    } catch (e2) {
      flash(errMsg(e2), true);
    } finally {
      setSaving(false);
    }
  };

  const toggleImportant = async (qq) => {
    try {
      await api.patch(`/quizzes/questions/${qq._id}`, { important: !qq.important });
      load();
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  const remove = async (qq) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/quizzes/questions/${qq._id}`);
      flash("Question deleted 🗑️");
      load();
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  if (error) return <ErrorBox text={error} />;
  if (!data || !settings) return <Loading />;

  const { course, questions, lessons = [] } = data;
  const counts = {};
  questions.forEach((x) => { counts[x.topic] = (counts[x.topic] || 0) + 1; });
  const important = questions.filter((x) => x.important).length;

  return (
    <div className="space-y-6">
      <Link to={`/teacher/courses/${course._id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> {course.title}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{data.quiz.title}</h1>
          <p className="mt-1 text-gray-400">{questions.length} questions in the bank · {important} marked ⭐ important</p>
        </div>
        <button onClick={deleteQuiz} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">
          <Trash2 size={15} /> Delete quiz
        </button>
      </div>

      {msg && (
        <div className={`page-enter rounded-xl border px-4 py-3 text-sm ${msg.bad ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AIPanel quizId={id} lessons={lessons} topics={course.topics} onAdded={load} flash={flash} />

          <Card title="Add a question yourself" icon={Plus}>
            <form onSubmit={addQuestion} className="space-y-3">
              <textarea className={input} rows={2} placeholder="Question, e.g. What does HTML stand for?" value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} required />
              <p className="text-xs text-gray-500">Tap the letter of the correct answer.</p>
              <div className="grid gap-2 md:grid-cols-2">
                {q.options.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-xl border p-1.5 transition ${q.correctIndex === i ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/10"}`}>
                    <button type="button" onClick={() => setQ({ ...q, correctIndex: i })}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${q.correctIndex === i ? "bg-emerald-500 text-white" : "bg-white/10 text-gray-300"}`}>
                      {q.correctIndex === i ? <CheckCircle2 size={16} /> : LETTERS[i]}
                    </button>
                    <input className="w-full bg-transparent px-1 py-1.5 text-sm outline-none" placeholder={`Option ${LETTERS[i]}`} value={opt}
                      onChange={(e) => { const o = [...q.options]; o[i] = e.target.value; setQ({ ...q, options: o }); }} />
                  </div>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <input className={input} list="topic-list" placeholder="Topic, e.g. HTML" value={q.topic} onChange={(e) => setQ({ ...q, topic: e.target.value })} required />
                <datalist id="topic-list">{course.topics.map((t) => <option key={t} value={t} />)}</datalist>
                <button type="button" onClick={() => setQ({ ...q, important: !q.important })}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${q.important ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-white/10 text-gray-400 hover:text-white"}`}>
                  <Star size={16} className={q.important ? "fill-amber-300" : ""} /> {q.important ? "Important for exam" : "Mark as important"}
                </button>
              </div>
              <button disabled={saving} className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50">
                {saving ? "Saving..." : "Save question"}
              </button>
            </form>
          </Card>

          <Card title="Question bank" icon={ListChecks}>
            {!questions.length ? (
              <Empty text="No questions yet. Generate with AI or add one yourself 👆" />
            ) : (
              <ol className="space-y-3 stagger">
                {questions.map((qq, n) => (
                  <li key={qq._id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge className="bg-violet-500/15 text-violet-300">{qq.topic}</Badge>
                          {qq.important && <Badge className="bg-amber-500/15 text-amber-300">⭐ Important</Badge>}
                        </div>
                        <p className="font-medium">{n + 1}. {qq.text}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => toggleImportant(qq)} title="Important" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-amber-300">
                          <Star size={16} className={qq.important ? "fill-amber-300 text-amber-300" : ""} />
                        </button>
                        <button onClick={() => remove(qq)} title="Delete" className="rounded-lg p-2 text-gray-400 hover:bg-rose-500/15 hover:text-rose-300">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                      {qq.options.map((o, i) => (
                        <span key={i} className={i === qq.correctIndex ? "text-emerald-300" : "text-gray-400"}>
                          {i === qq.correctIndex ? "✓" : LETTERS[i] + "."} {o}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Quiz settings" icon={Settings}>
            <form onSubmit={saveSettings} className="space-y-3">
              <label className="block text-xs text-gray-400">Title
                <input className={`${input} mt-1`} value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-400">Minutes
                  <input className={`${input} mt-1`} type="number" min="1" value={settings.timeLimitMinutes} onChange={(e) => setSettings({ ...settings, timeLimitMinutes: e.target.value })} />
                </label>
                <label className="text-xs text-gray-400">Questions per try
                  <input className={`${input} mt-1`} type="number" min="1" value={settings.questionsPerAttempt} onChange={(e) => setSettings({ ...settings, questionsPerAttempt: e.target.value })} />
                </label>
              </div>
              <label className="block text-xs text-gray-400">📅 Test date
                <input className={`${input} mt-1`} type="date" value={settings.testDate} onChange={(e) => setSettings({ ...settings, testDate: e.target.value })} />
              </label>
              <button className="w-full rounded-xl bg-white/10 py-2 text-sm font-semibold hover:bg-white/20">Save settings</button>
              <p className="text-[11px] text-gray-500">Setting a new date notifies all enrolled students and their parents.</p>
            </form>
          </Card>

          <Card title="Questions per topic" icon={AlertTriangle}>
            {!Object.keys(counts).length ? (
              <Empty text="Add questions to see the count" />
            ) : (
              <ul className="space-y-2 text-sm">
                {Object.entries(counts).map(([t, n]) => (
                  <li key={t} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span>{t}</span>
                    {n >= NEEDED ? <span className="text-emerald-300">{n} ✓</span> : <span className="text-amber-300">{n} · add {NEEDED - n} more</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-gray-500">Tip: {NEEDED}+ questions per topic means every re-test gets new questions.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}