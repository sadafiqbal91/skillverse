import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rocket, CheckCircle2, Circle, Copy, Check, X } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

// 🚀 Naye institute ke liye: "agla kadam kya hai?"
export default function GettingStarted() {
  const { organization } = useAuth();
  const [counts, setCounts] = useState(null);
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem("sv_setup_done") === "1");

  useEffect(() => {
    if (hidden) return;
    Promise.all([
      api.get("/users?role=instructor").catch(() => ({ data: { users: [] } })),
      api.get("/users?role=student").catch(() => ({ data: { users: [] } })),
      api.get("/courses").catch(() => ({ data: { courses: [] } })),
    ]).then(([t, s, c]) =>
      setCounts({ teachers: t.data.users?.length || 0, students: s.data.users?.length || 0, courses: c.data.courses?.length || 0 })
    );
  }, [hidden]);

  if (hidden || !counts) return null;

  const link = `${window.location.origin}/login/${organization?.slug || ""}`;
  const steps = [
    { done: true, label: "Institute registered" },
    { done: counts.teachers > 0, label: "Add your teachers", to: "/admin/users", cta: "Add users" },
    { done: counts.courses > 0, label: "Teachers create the first subject (✨ AI can write lessons and questions)" },
    { done: counts.students > 0, label: "Add students and parents, or let students sign up", to: "/admin/users", cta: "Add users" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null; // sab ho gaya, checklist ki zaroorat nahi

  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="page-enter rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20"><Rocket className="h-5 w-5 text-cyan-300" /></div>
          <div>
            <h2 className="text-lg font-bold">Let's set up {organization?.name}</h2>
            <p className="text-xs text-gray-400">{done} of {steps.length} done</p>
          </div>
        </div>
        <button onClick={() => { localStorage.setItem("sv_setup_done", "1"); setHidden(true); }} title="Hide"
          className="rounded-lg p-2 text-gray-500 hover:bg-white/10 hover:text-white"><X size={16} /></button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-2.5 text-sm">
            {s.done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} className="text-gray-500" />}
            <span className={`flex-1 ${s.done ? "text-gray-400 line-through" : ""}`}>{s.label}</span>
            {!s.done && s.to && (
              <Link to={s.to} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">{s.cta} →</Link>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center">
        <span className="text-xs text-gray-400">🔗 Share this sign-in link:</span>
        <code className="flex-1 truncate text-sm text-cyan-200">{link}</code>
        <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}