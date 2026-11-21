import CountUp from "./CountUp";

const TONES = {
  violet: "from-violet-500/25 to-violet-500/5 text-violet-300 ring-violet-500/30",
  emerald: "from-emerald-500/25 to-emerald-500/5 text-emerald-300 ring-emerald-500/30",
  amber: "from-amber-500/25 to-amber-500/5 text-amber-300 ring-amber-500/30",
  rose: "from-rose-500/25 to-rose-500/5 text-rose-300 ring-rose-500/30",
  cyan: "from-cyan-500/25 to-cyan-500/5 text-cyan-300 ring-cyan-500/30",
};

const SURFACE =
  "rounded-2xl border border-white/[0.08] bg-[#12122a]/80 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-violet-900/20";

export function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <div className={`${SURFACE} p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={18} className="text-violet-400" />}
            <h3 className="font-semibold text-[15px]">{title}</h3>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, value, label, hint, tone = "violet" }) {
  return (
    <div className={`${SURFACE} p-4 flex items-center gap-4`}>
      <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ring-1 ${TONES[tone]} flex items-center justify-center`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold tracking-tight">
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </div>
        <div className="text-xs text-gray-400">{label}</div>
        {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="bar-grow h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

export function Empty({ text }) {
  return <p className="text-sm text-gray-500 py-8 text-center">{text}</p>;
}

export function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
      </div>
      <div className="h-64 rounded-2xl bg-white/5" />
    </div>
  );
}

export function ErrorBox({ text }) {
  return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-4 py-3 text-sm">{text}</div>;
}