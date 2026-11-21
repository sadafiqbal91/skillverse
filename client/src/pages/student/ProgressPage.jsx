import { useEffect, useMemo, useState } from "react";
import { BarChart3, ListChecks, NotebookPen, History, BookOpen, CheckCircle2, Brain, AlertTriangle, ChevronDown, Eye } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, StatCard, Badge, Empty, Loading, ErrorBox } from "../../components/ui";
import TopicBars, { LEVELS } from "../../components/TopicBars";
import AnswersDrawer from "../../components/AnswersDrawer";

function MistakeNotebook({ mistakes }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("All");

  const grouped = useMemo(() => {
    const map = new Map();
    mistakes.forEach((m) => {
      const key = `${m.topic}|${m.question}`;
      const g = map.get(key);
      if (g) {
        g.count += 1;
        g.quizzes.add(m.quiz);
        g.yourAnswers.add(m.yourAnswer);
      } else {
        map.set(key, {
          topic: m.topic, question: m.question, correctAnswer: m.correctAnswer,
          count: 1, quizzes: new Set([m.quiz]), yourAnswers: new Set([m.yourAnswer]),
        });
      }
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [mistakes]);

  const topicCounts = useMemo(() => {
    const c = {};
    grouped.forEach((g) => { c[g.topic] = (c[g.topic] || 0) + 1; });
    return c;
  }, [grouped]);

  const topics = Object.keys(topicCounts);
  const shown = filter === "All" ? grouped : grouped.filter((g) => g.topic === filter);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15">
            <NotebookPen className="h-4 w-4 text-violet-300" />
          </div>
          <div>
            <p className="font-semibold">Mistake Notebook</p>
            <p className="text-xs text-gray-400">
              {grouped.length ? `${grouped.length} mistakes in ${topics.length} topics · tap to ${open ? "hide" : "review"}` : "No mistakes yet 🌟"}
            </p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 pb-5">
            {!grouped.length ? <Empty text="No mistakes yet 🌟" /> : (
              <>
                <div className="flex flex-wrap gap-2">
                  {["All", ...topics].map((t) => (
                    <button key={t} onClick={() => setFilter(t)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === t ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                      {t} <span className="opacity-70">{t === "All" ? grouped.length : topicCounts[t]}</span>
                    </button>
                  ))}
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {shown.map((m) => (
                    <li key={`${m.topic}|${m.question}`} className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-violet-300">{m.topic}</span>
                        <div className="flex items-center gap-2">
                          {m.count > 1 && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-300">Wrong {m.count}×</span>}
                          <span className="text-[11px] text-gray-500">{[...m.quizzes].join(", ")}</span>
                        </div>
                      </div>
                      <div className="mb-2 font-medium">{m.question}</div>
                      <div className="text-xs text-rose-300">✗ Your answer: {[...m.yourAnswers].join(" / ")}</div>
                      <div className="text-xs text-emerald-300">✓ Correct: {m.correctAnswer}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");
  const [answersUrl, setAnswersUrl] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/students/me/progress"), api.get("/attempts/me")])
      .then(([p, a]) => {
        setData(p.data);
        setAttempts(a.data.attempts);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;

  const { summary, topics, weakTopics, mistakeNotebook } = data;
  const submitted = attempts.filter((a) => !a.status || a.status === "submitted");

  return (
    <div className="space-y-6 stagger">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Progress</h1>
        <p className="text-gray-400 mt-1">Your full report card: every topic, every attempt, every lesson learned.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard icon={BookOpen} value={summary.coursesEnrolled} label="Courses enrolled" tone="violet" />
        <StatCard icon={CheckCircle2} value={summary.coursesCompleted} label="Completed" tone="emerald" />
        <StatCard icon={Brain} value={summary.averageQuizPercent} label="Quiz average %" tone="amber" />
        <StatCard icon={AlertTriangle} value={weakTopics.length} label="Weak topics" tone="rose" />
      </div>

      <Card title="Topic Mastery" icon={BarChart3}>
        <TopicBars topics={topics} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Topic Details" icon={ListChecks}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-white/[0.06]">
                <th className="pb-2 font-medium">Topic</th>
                <th className="pb-2 font-medium">Score</th>
                <th className="pb-2 font-medium">Answered</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => {
                const lvl = LEVELS[t.level];
                return (
                  <tr key={t.topic} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-2.5 font-medium">{t.topic}</td>
                    <td className="py-2.5 text-gray-300">
                      {t.level === "not_started" ? "—" : `${t.percent}%`}
                      {t.level === "recovered" && <span className="text-cyan-300"> → {t.retestPercent}%</span>}
                    </td>
                    <td className="py-2.5 text-gray-400">{t.total ? `${t.correct}/${t.total}` : "—"}</td>
                    <td className="py-2.5">
                      <Badge className="bg-white/5">
                        <span className="h-2 w-2 rounded-full" style={{ background: lvl.color }} /> {lvl.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Attempt History" icon={History} action={submitted.length ? <span className="text-[11px] text-gray-500">Tap to see answers</span> : null}>
          {!submitted.length ? (
            <Empty text="No attempts yet" />
          ) : (
            <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {submitted.map((a) => (
                <li key={a._id}>
                  <button onClick={() => setAnswersUrl(`/answers/attempt/${a._id}`)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {a.kind === "retest" ? `Re-test: ${a.topicScores?.[0]?.topic || ""}` : a.quizId?.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.kind === "retest" && <Badge className="bg-cyan-500/15 text-cyan-300">Re-test</Badge>}
                      <span className={`text-sm font-semibold ${a.passed ? "text-emerald-300" : "text-rose-300"}`}>{a.percent}%</span>
                      <Eye size={15} className="text-gray-500 transition group-hover:text-white" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <MistakeNotebook mistakes={mistakeNotebook} />

      {answersUrl && <AnswersDrawer url={answersUrl} onClose={() => setAnswersUrl(null)} />}
    </div>
  );
}