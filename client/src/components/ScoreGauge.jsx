import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ScoreGauge({ value = 0, label = "Average" }) {
  const data = [{ v: value }, { v: 100 - value }];
  return (
    <div className="relative h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <Pie data={data} dataKey="v" innerRadius="72%" outerRadius="90%" startAngle={90} endAngle={-270} stroke="none">
            <Cell fill="url(#gaugeGrad)" />
            <Cell fill="rgba(255,255,255,0.08)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{value}%</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </div>
  );
}