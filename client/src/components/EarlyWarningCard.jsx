import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Telescope, BellRing, Check, CalendarClock } from "lucide-react";
import api, { errMsg } from "../api/api";

// 🔮 Fail hone se PEHLE: kaun agle test mein mushkil mein aa sakta hai
const LEVEL = {
  high: { dot: "🟠", ring: "border-orange-500/30 bg-orange-500/[0.07]", label: "Watch closely", chip: "bg-orange-500/15 text-orange-300" },
  medium: { dot: "🟡", ring: "border-amber-500/25 bg-amber-500/[0.05]", label: "Keep an eye", chip: "bg-amber-500/15 text-amber-300" },
};
const days = (d) => {
  const n = Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return n <= 0 ? "today" : n === 1 ? "tomorrow" : "in " + n + " days";
};

export default function EarlyWarningCard({ admin = false, className = "" }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState({});
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api.get("/dashboard/early-warning").then((r) => setList(r.data.students)).catch((e) => setError(errMsg(e)));
  }, []);

  const remind = async (s) => {
    const k = s.studentId + ":" + s.courseId;
    setBusy(k);
    try {
      await api.post("/dashboard/early-warning/remind", { studentId: s.studentId, courseId: s.courseId });
      setSent((m) => ({ ...m, [k]: true }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={"rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-500/5 p-5 " + className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Telescope size={18} className="text-violet-300" /> 🔮 Early Warning
            {list && list.length > 0 && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-200">{list.length}</span>}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">Students who might struggle in the next test. Caught early, before they fail.</p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      {!list && !error && <div className="mt-4 h-20 animate-pulse rounded-xl bg-white/5" />}
      {list && !list.length && (
        <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">🎉 No early warnings. Everyone looks on track.</p>
      )}

      {list && list.length > 0 && (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {list.slice(0, 8).map((s) => {
            const lv = LEVEL[s.level] || LEVEL.medium;
            const k = s.studentId + ":" + s.courseId;
            const name = admin ? (
              <Link to={"/admin/students?id=" + s.studentId} className="hover:text-violet-300">{s.name}</Link>
            ) : s.name;
            return (
              <li key={k} className={"rounded-xl border p-3 " + lv.ring}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{lv.dot} {name}</p>
                    <p className="truncate text-xs text-gray-400">{s.course}</p>
                  </div>
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " + lv.chip}>{lv.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.reasons.map((r) => (
                    <span key={r.text} className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-gray-200">{r.icon} {r.text}</span>
                  ))}
                </div>
                {s.nextTest && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-violet-300">
                    <CalendarClock size={12} /> {s.nextTest.title} {days(s.nextTest.testDate)}
                  </p>
                )}
                <button onClick={() => remind(s)} disabled={sent[k] || busy === k}
                  className={"mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                    (sent[k] ? "bg-emerald-500/15 text-emerald-300" : "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50")}>
                  {sent[k] ? <><Check size={13} /> Reminder sent</> : <><BellRing size={13} /> {busy === k ? "Sending..." : "Send a reminder"}</>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {list && list.length > 8 && <p className="mt-2 text-xs text-gray-500">+ {list.length - 8} more</p>}
      <p className="mt-3 text-[11px] text-gray-500">Looks at: 📉 falling scores · 😴 no activity · 📝 missing homework · 📅 a test coming soon</p>
    </div>
  );
}