import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Brain, LifeBuoy, ClipboardCheck, AlertTriangle, BarChart3, Sprout, UserRound, ArrowRight, Plus, BookOpen } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Card, StatCard, Badge, Empty, Loading, ErrorBox, ProgressBar } from "../../components/ui";

const toneFor = (p) =>
  p >= 70 ? { bar: "from-emerald-500 to-emerald-400", text: "text-emerald-300", label: "Strong" }
  : p >= 50 ? { bar: "from-amber-500 to-amber-400", text: "text-amber-300", label: "Average" }
  : { bar: "from-rose-500 to-rose-400", text: "text-rose-300", label: "Weak" };

function PipelineBox({ icon: Icon, count, label, hint, cls }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-black/20 p-4 ${count ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cls}`}><Icon size={16} /></div>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [sel, setSel] = useState(0);

  useEffect(() => {
    api.get("/dashboard/instructor").then((r) => setCourses(r.data.courses)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <ErrorBox text={error} />;
  if (!courses) return <Loading />;

  if (!courses.length) {
    return (
      <Card className="text-center">
        <BookOpen className="mx-auto mb-3 text-violet-400" size={36} />
        <h2 className="text-xl font-bold">Welcome, {user?.name} 👋</h2>
        <p className="mt-1 text-gray-400">You have no courses yet. Create your first one to get started.</p>
        <Link to="/teacher/courses" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 font-semibold">
          <Plus size={16} /> Create course
        </Link>
      </Card>
    );
  }

  const sum = (fn) => courses.reduce((s, c) => s + fn(c), 0);
  const totalStudents = sum((c) => c.students);
  const needHelp = sum((c) => c.interventions.needs_practice + c.interventions.intervention + c.interventions.one_on_one);
  const pending = sum((c) => c.pendingGrading);
  const withQuiz = courses.filter((c) => c.quizAttempts > 0);
  const avgQuiz = withQuiz.length ? Math.round(withQuiz.reduce((s, c) => s + c.averageQuizPercent, 0) / withQuiz.length) : 0;
  const c = courses[sel] || courses[0];
  const iv = c.interventions;

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {user?.name} 👋</h1>
          <p className="mt-1 text-gray-400">Here is how your classes are doing today.</p>
        </div>
        <Link to="/teacher/courses" className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:opacity-90">
          <Plus size={16} /> New course
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
        <StatCard icon={Users} value={totalStudents} label="Students" tone="violet" />
        <StatCard icon={Brain} value={avgQuiz} label="Class quiz average %" tone="cyan" />
        <StatCard icon={LifeBuoy} value={needHelp} label="Students needing help" tone="rose" />
        <StatCard icon={ClipboardCheck} value={pending} label="Waiting for grading" tone="amber" />
      </div>

      <div className="flex flex-wrap gap-2">
        {courses.map((co, i) => (
          <button key={co.courseId} onClick={() => setSel(i)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${i === sel ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            {co.title}
            {co.status === "draft" && <span className="rounded-full bg-white/15 px-1.5 text-[10px]">Draft</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Class Topic Heatmap" icon={BarChart3} className="lg:col-span-2"
          action={<span className="text-xs text-gray-500">{c.students} students · {c.quizAttempts} attempts</span>}>
          {!c.topics.length ? (
            <Empty text="No quiz attempts yet. Once students take quizzes, weak topics show up here." />
          ) : (
            <ul className="space-y-3">
              {c.topics.map((t) => {
                const tn = toneFor(t.percent);
                return (
                  <li key={t.topic}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{t.topic}</span>
                      <span className={`font-semibold ${tn.text}`}>{t.percent}% · {tn.label}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={`bar-grow h-full rounded-full bg-gradient-to-r ${tn.bar}`} style={{ width: `${Math.max(t.percent, 3)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {c.classWeakTopics.length > 0 && (
            <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              ⚠️ The whole class is weak in <b>{c.classWeakTopics.join(", ")}</b>. Consider re-teaching it in class.
            </p>
          )}
        </Card>

        <Card title="Course Snapshot" icon={BookOpen}>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span className="text-gray-400">Average progress</span><span>{c.averageProgress}%</span></div>
              <ProgressBar value={c.averageProgress} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span className="text-gray-400">Average quiz score</span><span>{c.averageQuizPercent}%</span></div>
              <ProgressBar value={c.averageQuizPercent} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-sm">
              <span className="text-gray-400">Status</span>
              <Badge className={c.status === "published" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-gray-300"}>
                {c.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
            <Link to="/teacher/grading" className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-sm hover:bg-white/5">
              <span className="text-gray-400">Submissions to grade</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">{c.pendingGrading} <ArrowRight size={14} /></span>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Smart Intervention Loop" icon={LifeBuoy} className="lg:col-span-2"
          action={<Link to="/teacher/interventions" className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">Weak topics <ArrowRight size={14} /></Link>}>
          <div className="grid gap-3 sm:grid-cols-3">
            <PipelineBox icon={Sprout} count={iv.needs_practice} label="Practising" hint="Auto re-test running" cls="bg-emerald-500/15 text-emerald-300" />
            <PipelineBox icon={LifeBuoy} count={iv.intervention} label="Need your notes" hint="Send notes once, all get them" cls="bg-rose-500/15 text-rose-300" />
            <PipelineBox icon={UserRound} count={iv.one_on_one} label="1-on-1" hint="Tried 3 times, needs you" cls="bg-amber-500/15 text-amber-300" />
          </div>
        </Card>

        <Card title="At-risk Students" icon={AlertTriangle}>
          {!c.atRisk.length ? (
            <Empty text="Nobody at risk right now 🎉" />
          ) : (
            <ul className="space-y-2">
              {c.atRisk.map((s) => (
                <li key={s.name} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-sm font-medium">{s.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.reasons.map((r) => <Badge key={r} className="bg-rose-500/15 text-rose-300">{r}</Badge>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}