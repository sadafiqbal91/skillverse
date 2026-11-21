import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, BookOpen, CheckCircle2, Brain, AlertTriangle, BarChart3, LifeBuoy, ClipboardCheck, History, Printer, Users } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, StatCard, Badge, Empty, Loading, ErrorBox } from "../../components/ui";
import TopicBars from "../../components/TopicBars";

const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const LEVEL = {
  needs_practice: ["Practising", "bg-emerald-500/15 text-emerald-300"],
  intervention: ["Teacher help", "bg-rose-500/15 text-rose-300"],
  one_on_one: ["1-on-1", "bg-amber-500/15 text-amber-300"],
};

export default function StudentLookupPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const id = params.get("id");

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/dashboard/admin/students?q=${encodeURIComponent(q.trim())}`).then((r) => setResults(r.data.students)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!id) { setDetail(null); return; }
    setLoading(true);
    setError("");
    Promise.all([api.get(`/dashboard/admin/students/${id}`), api.get(`/results/student/${id}`)])
      .then(([a, b]) => setDetail({ ...a.data, events: b.data.events }))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const open = (sid) => { setParams({ id: sid }); setQ(""); setResults([]); };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Student Lookup</h1>
        <p className="mt-1 text-gray-400">A parent walks in? Search the name and show the full report in one minute.</p>
        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a student's name..."
            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#12122a] shadow-2xl">
              {results.map((s) => (
                <li key={s._id}>
                  <button onClick={() => open(s._id)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-white/5">
                    <span className="font-medium">{s.name}</span><span className="text-xs text-gray-500">{s.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && <ErrorBox text={error} />}
      {loading && <Loading />}
      {!id && !loading && <Card><Empty text="Search a student above to see their full report." /></Card>}

      {detail && !loading && (
        <div className="print-area space-y-6 page-enter">
          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{detail.student.name}</h2>
                <p className="text-sm text-gray-400">{detail.student.email}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-300">
                  <Users size={15} className="text-violet-400" />
                  Parents: {detail.parents.length ? detail.parents.map((p) => p.name).join(", ") : "not linked yet"}
                </p>
              </div>
              <button onClick={() => window.print()} className="no-print inline-flex items-center gap-2 self-start rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
                <Printer size={16} /> Print / PDF
              </button>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={BookOpen} value={detail.summary?.coursesEnrolled ?? 0} label="Courses" tone="violet" />
            <StatCard icon={CheckCircle2} value={detail.summary?.coursesCompleted ?? 0} label="Completed" tone="emerald" />
            <StatCard icon={Brain} value={detail.summary?.averageQuizPercent ?? 0} label="Quiz average %" tone="amber" />
            <StatCard icon={AlertTriangle} value={detail.weakTopics?.length ?? 0} label="Weak topics" tone="rose" />
          </div>

          <Card title="Topic mastery" icon={BarChart3}>
            {detail.topics?.length ? <TopicBars topics={detail.topics} /> : <Empty text="No quiz data yet." />}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Getting help right now" icon={LifeBuoy}>
              {!detail.activeHelp.length ? <Empty text="Nothing pending 🎉" /> : (
                <ul className="space-y-2">
                  {detail.activeHelp.map((h) => {
                    const [label, cls] = LEVEL[h.level] || ["", ""];
                    return (
                      <li key={h._id} className="flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-sm">
                        <span><b>{h.topic}</b> <span className="text-gray-500">· {h.courseId?.title}</span></span>
                        <span className="flex items-center gap-2">
                          <span className="text-gray-400">{h.latestPercent}%</span>
                          <Badge className={cls}>{label}</Badge>
                          {h.notesSent && <Badge className="bg-white/5 text-gray-300">📄 notes</Badge>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Assignments" icon={ClipboardCheck}>
              {!detail.submissions.length ? <Empty text="No assignments submitted yet." /> : (
                <ul className="space-y-2">
                  {detail.submissions.map((s) => (
                    <li key={s._id} className="flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2.5 text-sm">
                      <span>{s.assignmentId?.title}{s.isLate && <span className="ml-1 text-xs text-rose-300">(late)</span>}</span>
                      {s.status === "graded"
                        ? <Badge className="bg-emerald-500/15 text-emerald-300">{s.marks}/{s.assignmentId?.maxMarks}</Badge>
                        : <Badge className="bg-amber-500/15 text-amber-300">Waiting for grade</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Activity" icon={History}>
            {!detail.events.length ? <Empty text="No activity yet." /> : (
              <ol className="space-y-1">
                {detail.events.slice(0, 25).map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm">{e.icon}</span>
                    <div className="pb-3 pt-1">
                      <p className={`text-sm ${e.good === true ? "text-emerald-300" : e.good === false ? "text-rose-300" : "text-gray-200"}`}>{e.text}</p>
                      <p className="text-xs text-gray-500">{fmt(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}