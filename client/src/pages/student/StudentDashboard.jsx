import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, CheckCircle2, Brain, AlertTriangle, BarChart3, Target, TrendingUp, NotebookPen, ArrowRight,
} from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Card, StatCard, ProgressBar, Empty, Loading, ErrorBox } from "../../components/ui";
import CountUp from "../../components/CountUp";
import ScoreGauge from "../../components/ScoreGauge";
import TopicBars from "../../components/TopicBars";
import ScoreTrend from "../../components/ScoreTrend";
import NeedsPracticeCard from "../../components/NeedsPracticeCard";
import DiaryCard from "../../components/DiaryCard";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [ivs, setIvs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/students/me/progress"), api.get("/interventions/me")])
      .then(([p, i]) => {
        setData(p.data);
        setIvs(i.data.interventions);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;

  const { summary, courses, topics, weakTopics, recentAttempts, mistakeNotebook } = data;
  const firstName = user?.name?.split(" ")[0];
  const link = (to, text) => (
    <Link to={to} className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">
      {text} <ArrowRight size={14} />
    </Link>
  );

  return (
    <div className="space-y-6 stagger">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/25 via-indigo-600/10 to-cyan-500/10 p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute right-40 -bottom-16 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {firstName} 👋</h1>
            <p className="text-gray-300/80 mt-1">
              {weakTopics.length
                ? `${weakTopics.length} topic${weakTopics.length > 1 ? "s need" : " needs"} a little practice. A quick re-test can fix that.`
                : "You're doing great across all topics. Keep the streak going!"}
            </p>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-bold">
                <CountUp value={summary.averageQuizPercent} suffix="%" />
              </div>
              <div className="text-xs text-gray-400">Quiz average</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {summary.coursesCompleted}/{summary.coursesEnrolled}
              </div>
              <div className="text-xs text-gray-400">Courses completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* 📒 Aaj kya karna hai */}
      <DiaryCard linkFor={(i) => (i.type === "homework" ? `/student/courses/${i.courseId}` : i.done ? null : `/student/quiz/${i._id}`)} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard icon={BookOpen} value={summary.coursesEnrolled} label="Courses enrolled" tone="violet" />
        <StatCard icon={CheckCircle2} value={summary.coursesCompleted} label="Completed" tone="emerald" />
        <StatCard icon={Brain} value={summary.quizzesTaken} label="Quizzes taken" tone="amber" />
        <StatCard icon={AlertTriangle} value={weakTopics.length} label="Weak topics" tone="rose" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Topic Mastery" icon={BarChart3} className="lg:col-span-2">
          <TopicBars topics={topics} />
        </Card>
        <Card title="Quiz Average" icon={Target}>
          <ScoreGauge value={summary.averageQuizPercent} label="Overall score" />
          <p className="text-center text-xs text-gray-500 mt-2">Across {summary.quizzesTaken} quiz attempt(s)</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Score Trend" icon={TrendingUp} className="lg:col-span-2">
          <ScoreTrend attempts={recentAttempts} />
        </Card>
        <NeedsPracticeCard items={ivs} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Course Progress" icon={BookOpen} className="lg:col-span-2" action={link("/student/courses", "View all")}>
          {!courses.length ? (
            <Empty text="You haven't enrolled in any course yet" />
          ) : (
            <ul className="space-y-5">
              {courses.map((c) => (
                <li key={c.courseId}>
                  <Link to={`/student/courses/${c.courseId}`} className="block group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium group-hover:text-violet-300">{c.title}</span>
                      <span className="text-gray-400">
                        {c.progressPercent}% {c.status === "completed" && <CheckCircle2 size={14} className="inline text-emerald-400" />}
                      </span>
                    </div>
                    <ProgressBar value={c.progressPercent} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Mistake Notebook" icon={NotebookPen} action={link("/student/progress", "Full report")}>
          {!mistakeNotebook.length ? (
            <Empty text="No mistakes yet 🌟" />
          ) : (
            <ul className="space-y-3">
              {mistakeNotebook.slice(0, 3).map((m, i) => (
                <li key={i} className="rounded-xl border border-white/[0.06] bg-black/20 p-3 text-sm">
                  <div className="text-[11px] uppercase tracking-wide text-violet-300 mb-1">{m.topic}</div>
                  <div className="font-medium mb-2">{m.question}</div>
                  <div className="text-rose-300 text-xs">✗ {m.yourAnswer}</div>
                  <div className="text-emerald-300 text-xs">✓ {m.correctAnswer}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}