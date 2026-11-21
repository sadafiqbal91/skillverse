import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Empty } from "./ui";

export default function ScoreTrend({ attempts }) {
  if (!attempts?.length) return <Empty text="No quizzes yet" />;

  const data = [...attempts].reverse().map((a) => ({
    date: new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    percent: a.percent,
    quiz: a.quiz,
  }));

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, left: -20, right: 8 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "#14142b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
            formatter={(v, _n, p) => [`${v}%`, p.payload.quiz]}
          />
          <Area type="monotone" dataKey="percent" stroke="url(#trendLine)" strokeWidth={3} fill="url(#trendFill)"
            dot={{ r: 4, fill: "#22d3ee", strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}