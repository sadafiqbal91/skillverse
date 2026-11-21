import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Bell, Users, X, History } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Empty, Loading, ErrorBox } from "../../components/ui";

const tone = (p) => (p >= 70 ? "text-emerald-300 bg-emerald-500/10" : p >= 50 ? "text-amber-300 bg-amber-500/10" : "text-rose-300 bg-rose-500/10");
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Timeline({ student, courseId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`/results/student/${student._id}?courseId=${courseId}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [student._id, courseId]);

  return createPortal(
        <div
      className="bg-black/60 backdrop-blur-sm"
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0e0e22] p-6 text-white shadow-2xl page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-sm text-gray-400">Course progress {student.progress}% · Avg {student.average ?? "—"}%</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button>
        </div>

        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300"><History size={16} /> Activity</h3>
        {error && <ErrorBox text={error} />}
        {!data && !error && <div className="h-40 animate-pulse rounded-xl bg-white/5" />}
        {data && (!data.events.length ? <Empty text="No activity yet." /> : (
          <ol className="space-y-1">
            {data.events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm">{e.icon}</span>
                  {i < data.events.length - 1 && <span className="w-px flex-1 bg-white/10" />}
                </div>
                <div className="pb-4 pt-1">
                  <p className={`text-sm ${e.good === true ? "text-emerald-300" : e.good === false ? "text-rose-300" : "text-gray-200"}`}>{e.text}</p>
                  <p className="text-xs text-gray-500">{fmt(e.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        ))}
      </div>
    </div>,
    document.body
  );
}

export default function ResultsPage({ canRemind = true }) {
  const [courses, setCourses] = useState(null);
  const [cid, setCid] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [picked, setPicked] = useState(null);

    const [params] = useSearchParams();

  useEffect(() => {
    api.get("/courses?mine=true")
      .then((r) => {
        setCourses(r.data.courses);
        const want = params.get("course");
        const first = r.data.courses.find((c) => c._id === want) || r.data.courses[0];
        if (first) setCid(first._id);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  // Page khula ho aur search se doosra course chuna jaye
  useEffect(() => {
    const want = params.get("course");
    if (want) setCid(want);
  }, [params]);

  const load = useCallback(() => {
    if (!cid) return;
    setData(null);
    api.get(`/results/course/${cid}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const remind = async (q) => {
    try {
      const r = await api.post(`/results/quiz/${q._id}/remind`);
      setMsg({ text: r.data.message });
    } catch (e) {
      setMsg({ text: errMsg(e), bad: true });
    }
    setTimeout(() => setMsg(null), 3500);
  };

  if (error) return <ErrorBox text={error} />;
  if (!courses) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Results</h1>
        <p className="mt-1 text-gray-400">Who took which quiz, their scores, re-tests, and full activity.</p>
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

      {!data ? <Loading /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger">
            {!data.quizzes.length && <Card><Empty text="No quizzes in this course yet." /></Card>}
            {data.quizzes.map((q) => (
              <Card key={q._id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{q.title}</h3>
                  {q.average != null && <span className={`rounded-lg px-2 py-0.5 text-sm font-semibold ${tone(q.average)}`}>{q.average}%</span>}
                </div>
                <p className="mt-1 text-xs text-gray-500">{q.testDate ? `📅 ${fmt(q.testDate)}` : "No test date"}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Users size={15} className="text-violet-400" />
                  <span><b>{q.took}</b> of {q.total} took it</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="bar-grow h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${q.total ? (q.took / q.total) * 100 : 0}%` }} />
                </div>
                {q.notTaken.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs text-amber-300">⏳ Not yet: {q.notTaken.join(", ")}</p>
                    {canRemind && (
  <button onClick={() => remind(q)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25">
    <Bell size={13} /> Remind them
  </button>
)}
                  </div>
                ) : q.total > 0 && <p className="mt-3 text-xs text-emerald-300">🎉 Everyone took it</p>}
              </Card>
            ))}
          </div>

          <Card title="Gradebook" icon={BarChart3} action={<span className="text-xs text-gray-500">Best score per quiz · click a student</span>}>
            {!data.students.length ? <Empty text="No students enrolled yet." /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                      <th className="pb-2 pr-3 font-medium">Student</th>
                      {data.quizzes.map((q) => <th key={q._id} className="pb-2 pr-3 font-medium">{q.title}</th>)}
                      <th className="pb-2 pr-3 font-medium">Re-tests</th>
                      <th className="pb-2 font-medium">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s) => (
                      <tr key={s._id} onClick={() => setPicked(s)} className="cursor-pointer border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.03]">
                        <td className="py-2.5 pr-3 font-medium">{s.name}</td>
                        {data.quizzes.map((q) => {
                          const c = s.cells[q._id];
                          return (
                            <td key={q._id} className="py-2.5 pr-3">
                              {c ? <span className={`rounded-md px-2 py-0.5 font-semibold ${tone(c.best)}`}>{c.best}%{c.tries > 1 && <span className="ml-1 text-[10px] opacity-70">×{c.tries}</span>}</span>
                                : <span className="text-xs text-gray-500">⏳ not taken</span>}
                            </td>
                          );
                        })}
                        <td className="py-2.5 pr-3 text-xs text-gray-400">{s.retests.total ? `${s.retests.total} (${s.retests.passed} ✅)` : "—"}</td>
                        <td className="py-2.5">{s.average != null ? <Badge className={tone(s.average)}>{s.average}%</Badge> : <span className="text-gray-500">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {picked && <Timeline student={picked} courseId={cid} onClose={() => setPicked(null)} />}
    </div>
  );
}