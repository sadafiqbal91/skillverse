import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Empty } from "./ui";

export const LEVELS = {
  strong: { color: "#34d399", label: "Strong" },
  average: { color: "#fbbf24", label: "Average" },
  weak: { color: "#f87171", label: "Weak" },
  recovered: { color: "#22d3ee", label: "Recovered" },
  not_started: { color: "#4b5563", label: "Not started" },
};

export default function TopicBars({ topics }) {
  if (!topics?.length) return <Empty text="Take a quiz to see your topic mastery" />;

  const data = topics.map((t) => {
    const real = t.level === "not_started" ? null : t.level === "recovered" ? t.retestPercent : t.percent;
    return { ...t, real, shown: Math.max(real ?? 0, 4) };
  });

  return (
    <>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, left: -20, right: 8 }}>
            <XAxis dataKey="topic" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#14142b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
              labelStyle={{ color: "#fff" }}
              formatter={(_v, _n, p) => [
                p.payload.real === null ? "Not tested yet" : `${p.payload.real}% • ${LEVELS[p.payload.level].label}`,
                "Mastery",
              ]}
            />
            <Bar dataKey="shown" radius={[8, 8, 0, 0]} maxBarSize={52}>
              {data.map((d) => <Cell key={d.topic} fill={LEVELS[d.level].color} />)}
              <LabelList
                dataKey="real"
                position="top"
                formatter={(v) => (v === null ? "—" : `${v}%`)}
                style={{ fill: "#e5e7eb", fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
        {Object.values(LEVELS).map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </>
  );
}