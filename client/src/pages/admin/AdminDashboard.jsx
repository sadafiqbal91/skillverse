import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Presentation, Users, BookOpen, Flame, TrendingUp, AlertTriangle, ArrowRight, School } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Card, StatCard, Badge, Empty, Loading, ErrorBox } from "../../components/ui";
import TodayAtSchool from "../../components/TodayAtSchool";
import GettingStarted from "../../components/GettingStarted";
import EarlyWarningCard from "../../components/EarlyWarningCard";

const tone = (p) => (p == null ? "bg-white/5 text-gray-400" : p >= 70 ? "bg-emerald-500/15 text-emerald-300" : p >= 50 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300");
const LEVEL = { intervention: "bg-rose-500/15 text-rose-300", one_on_one: "bg-amber-500/15 text-amber-300" };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/admin").then((r) => setD(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <ErrorBox text={error} />;
  if (!d) return <Loading />;

  const maxWeak = Math.max(1, ...d.topWeakTopics.map((t) => t.students));
  const { newWeakTopicCases: newCases, resolved } = d.thisWeek;

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm text-violet-300"><School size={16} /> {d.institute}</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome, {user?.name} 👋</h1>
        <p className="text-gray-400">Your whole institute in one screen: every teacher, every course, every student who needs help.</p>
        <GettingStarted />
        <TodayAtSchool />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
        <StatCard icon={GraduationCap} value={d.counts.students} label="Students" tone="violet" />
        <StatCard icon={Presentation} value={d.counts.instructors} label="Teachers" tone="cyan" />
        <StatCard icon={Users} value={d.counts.parents} label="Parents" tone="emerald" />
        <StatCard icon={BookOpen} value={d.counts.publishedCourses} label="Published courses" tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="This week" icon={TrendingUp}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-rose-500/10 p-4">
              <p className="text-3xl font-bold text-rose-300">{newCases}</p>
              <p className="text-xs text-gray-400">new weak-topic cases</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-4">
              <p className="text-3xl font-bold text-emerald-300">{resolved}</p>
              <p className="text-xs text-gray-400">students recovered 🎉</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Weak students are caught in the same week, not after the exam.</p>
        </Card>

        <Card title="Top weak topics (whole school)" icon={Flame} className="lg:col-span-2">
          {!d.topWeakTopics.length ? <Empty text="No weak topics right now 🎉" /> : (
            <ul className="space-y-3">
              {d.topWeakTopics.map((t) => (
                <li key={t.topic}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{t.topic}</span><span className="text-rose-300">{t.students} student(s)</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-grow h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${(t.students / maxWeak) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 🔮 Fail hone se pehle pakro (poora school) */}
      <EarlyWarningCard admin />

      <Card title="Teachers" icon={Presentation} action={<span className="text-xs text-gray-500">Work measured by results</span>}>
        {!d.teachers.length ? <Empty text="No teachers yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Teacher</th><th className="pb-2 font-medium">Courses</th><th className="pb-2 font-medium">Students</th>
                  <th className="pb-2 font-medium">Notes sent</th><th className="pb-2 font-medium">Students recovered</th><th className="pb-2 font-medium">To grade</th>
                </tr>
              </thead>
              <tbody>
                {d.teachers.map((t) => (
                  <tr key={t._id} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-2.5 font-medium">{t.name}</td>
                    <td className="py-2.5 text-gray-300">{t.courses}</td>
                    <td className="py-2.5 text-gray-300">{t.students}</td>
                    <td className="py-2.5 text-gray-300">{t.notesSent}</td>
                    <td className="py-2.5"><Badge className="bg-emerald-500/15 text-emerald-300">{t.studentsHelped} 🎉</Badge></td>
                    <td className="py-2.5">{t.pendingGrading ? <Badge className="bg-amber-500/15 text-amber-300">{t.pendingGrading} ⚠️</Badge> : <span className="text-gray-500">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Courses" icon={BookOpen} className="lg:col-span-2"
          action={<Link to="/admin/results" className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">Full results <ArrowRight size={14} /></Link>}>
          {!d.courses.length ? <Empty text="No courses yet." /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {d.courses.map((c) => (
                <Link key={c._id} to="/admin/results" className="rounded-xl border border-white/[0.06] bg-black/20 p-4 transition hover:border-violet-500/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.title}</p>
                    {c.status !== "published" && <Badge className="bg-white/10 text-gray-300">Draft</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{c.teacher}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-white/5 text-gray-300">{c.students} students</Badge>
                    <Badge className={tone(c.averageQuiz)}>Quiz avg {c.averageQuiz ?? "—"}{c.averageQuiz != null && "%"}</Badge>
                    {c.needHelp > 0 && <Badge className="bg-rose-500/15 text-rose-300">{c.needHelp} need help</Badge>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Students needing help" icon={AlertTriangle}>
          {!d.atRisk.length ? <Empty text="Nobody needs extra help right now 🎉" /> : (
            <ul className="space-y-2">
              {d.atRisk.map((s) => (
                <li key={s._id}>
                  <Link to={`/admin/students?id=${s._id}`} className="block rounded-xl border border-white/[0.06] bg-black/20 p-3 transition hover:border-violet-500/40">
                    <p className="text-sm font-medium">{s.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.items.map((i, k) => (
                        <Badge key={k} className={LEVEL[i.level]}>{i.topic}{i.level === "one_on_one" ? " · 1-on-1" : ""}</Badge>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}