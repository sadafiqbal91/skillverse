import { useNavigate } from "react-router-dom";
import { Sprout, LifeBuoy, UserRound, Clock, ArrowRight } from "lucide-react";
import { Card, Empty, Badge } from "./ui";

const LEVEL = {
  needs_practice: { label: "Practice", icon: Sprout, cls: "bg-emerald-500/15 text-emerald-300" },
  intervention: { label: "Teacher help", icon: LifeBuoy, cls: "bg-rose-500/15 text-rose-300" },
  one_on_one: { label: "1-on-1 support", icon: UserRound, cls: "bg-amber-500/15 text-amber-300" },
};

// ●●○  used tries = rose, current = violet ring, upcoming = grey
export function RoundDots({ retestsLeft = 3, maxRounds = 3 }) {
  const used = maxRounds - retestsLeft;
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: maxRounds }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition ${
            i < used ? "bg-rose-400" : i === used ? "bg-violet-400 ring-2 ring-violet-400/30" : "bg-white/15"
          }`}
        />
      ))}
    </span>
  );
}

export default function NeedsPracticeCard({ items }) {
  const navigate = useNavigate();
  return (
    <Card title="Needs Practice" icon={Sprout} className="border-emerald-500/20">
      {!items.length ? (
        <Empty text="Great job! No weak topics right now 🎉" />
      ) : (
        <ul className="space-y-3">
          {items.map((iv) => {
            const lvl = LEVEL[iv.level];
            const max = iv.maxRounds || 3;
            const left = iv.retestsLeft ?? max;
            const oneOnOne = iv.level === "one_on_one" || left === 0;
            const waiting = iv.level === "intervention" && !iv.notesSent;
            const lastChance = !oneOnOne && left === 1;

            return (
              <li key={iv._id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="min-w-0">
                  <div className="font-medium">{iv.topic}</div>
                  <div className="truncate text-xs text-gray-400">{iv.courseId?.title} • {iv.latestPercent}%</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge className={lvl?.cls}>
                      {lvl && <lvl.icon size={12} />} {lvl?.label}
                    </Badge>
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <RoundDots retestsLeft={left} maxRounds={max} />
                      {oneOnOne ? `${max} of ${max} tries used` : `Re-test ${iv.round || max - left + 1} of ${max}`}
                    </span>
                    {lastChance && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Last chance</span>
                    )}
                  </div>
                </div>

                {oneOnOne ? (
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-amber-300">
                    <UserRound size={14} /> Teacher will meet you
                  </span>
                ) : waiting ? (
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-400">
                    <Clock size={14} /> Waiting for notes
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(`/student/retest/${iv._id}`)}
                    className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-1.5 text-sm font-medium hover:opacity-90"
                  >
                    Re-test <ArrowRight size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}