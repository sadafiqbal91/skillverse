import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { School, AlertTriangle, Clock, UserRound, RefreshCw } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useAuth } from "../context/AuthContext";

const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// 🏫 Principal: aaj kya hua + kis cheez par tawajjo chahiye
export default function TodayAtSchool() {
  const { organization } = useAuth();
  const place = organization?.type === "school" ? "school" : "your institute";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const asked = useRef(false); // morning summary sirf 1 baar maango

  const load = useCallback(() => {
    setError("");
    api.get("/summary/today").then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    load();
    if (!asked.current) {
      asked.current = true;
      api.post("/summary/auto").catch(() => {}); // ☀️ din mein pehli baar: kal ka khulasa 🔔
    }
  }, [load]);

  if (error) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>;
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-white/5" />;

  const s = data.stats;
  const { oneOnOne, gradingPending } = data.attention;
  const tiles = [
    [s.quizzes, "Quizzes taken", s.quizAvg != null ? `avg ${s.quizAvg}%` : ""],
    [s.activeStudents, "Active students", ""],
    [s.notesSent, "Notes sent", ""],
    [s.recovered, "Recovered 🎉", ""],
    [s.submitted, "Work submitted", ""],
    [s.graded, "Work checked", ""],
  ];
  const urgent = oneOnOne.length + gradingPending.length;

  return (
    <div className="page-enter rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-500/10 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20"><School className="h-5 w-5 text-violet-300" /></div>
          <div>
            <h2 className="text-lg font-bold">Today at {place}</h2>
            <p className="text-xs text-gray-400">{fmt(data.date)} · live · 🔔 a summary comes every morning and at 5 pm</p>
          </div>
        </div>
        <button onClick={load} title="Refresh" className="rounded-xl border border-white/10 p-2 text-gray-400 hover:bg-white/10 hover:text-white"><RefreshCw size={16} /></button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([v, l, sub]) => (
          <div key={l} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-2xl font-bold">{v}</div>
            <div className="text-xs text-gray-400">{l}</div>
            {sub && <div className="text-[11px] text-violet-300">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle size={16} className={urgent ? "text-amber-400" : "text-emerald-400"} />
          {urgent ? "Needs your attention" : "Nothing urgent today ✅"}
        </p>
        {urgent > 0 && (
          <ul className="space-y-2">
            {oneOnOne.map((c) => (
              <li key={c._id}>
                <Link to={`/admin/students?id=${c.studentId}`}
                  className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-2.5 text-sm transition hover:bg-rose-500/10">
                  <span>🔴</span>
                  <span className="flex-1"><b>{c.student}</b>: {c.topic}{c.course ? ` (${c.course})` : ""}</span>
                  <span className="text-xs text-rose-300">1-on-1 needed</span>
                </Link>
              </li>
            ))}
            {gradingPending.map((g) => (
              <li key={g.teacher} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-sm">
                <Clock size={15} className="text-amber-300" />
                <span className="flex-1"><UserRound size={13} className="mr-1 inline text-gray-400" /><b>{g.teacher}</b>: {g.count} assignment(s) waiting to be checked</span>
                <span className="text-xs text-amber-300">since {fmt(g.oldest)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}