import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NotebookPen, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import api from "../api/api";

// 📒 Diary: aaj, kal, is hafte kya karna hai (har subject ka homework + test)
const WORDS = {
  en: {
    title: "My Diary", titleParent: "Diary", sub: "Homework and tests for every subject, by day.",
    overdue: "⏰ Late, please finish", today: "Today", tomorrow: "Tomorrow", week: "This week", later: "Later",
    homework: "Homework", test: "Test", revision: "Revision test", done: "Done", empty: "Nothing due right now. Enjoy! 🎉",
    picture: "🖼️ has a picture", min: "min",
  },
  ur: {
    title: "Meri Diary", titleParent: "Diary", sub: "Har subject ka homework aur test, din ke hisaab se.",
    overdue: "⏰ Der ho gayi, jaldi karein", today: "Aaj", tomorrow: "Kal", week: "Is hafte", later: "Baad mein",
    homework: "Homework", test: "Test", revision: "Revision test", done: "Ho gaya", empty: "Abhi kuch baqi nahi. Shabash! 🎉",
    picture: "🖼️ tasveer ke saath", min: "min",
  },
};
const TYPE = { homework: ["📝", "bg-violet-500/15 text-violet-300"], test: ["🧠", "bg-cyan-500/15 text-cyan-300"], revision: ["📋", "bg-amber-500/15 text-amber-300"] };

const dayDiff = (d) => {
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
};
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export default function DiaryCard({ url = "/diary/me", parent = false, lang = "en", linkFor }) {
  const w = WORDS[lang] || WORDS.en;
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    api.get(url).then((r) => setItems(r.data.items)).catch(() => setItems([]));
  }, [url]);

  const groups = [
    ["overdue", w.overdue, (i) => i.overdue],
    ["today", w.today, (i) => !i.overdue && dayDiff(i.date) <= 0],
    ["tomorrow", w.tomorrow, (i) => !i.overdue && dayDiff(i.date) === 1],
    ["week", w.week, (i) => !i.overdue && dayDiff(i.date) >= 2 && dayDiff(i.date) <= 7],
    ["later", w.later, (i) => !i.overdue && dayDiff(i.date) > 7],
  ];
  const pending = (items || []).filter((i) => !i.done).length;

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <NotebookPen size={18} className="text-violet-300" /> 📒 {parent ? w.titleParent : w.title}
            {pending > 0 && <span className="rounded-full bg-violet-500/25 px-2 py-0.5 text-xs text-violet-200">{pending}</span>}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">{w.sub}</p>
        </div>
      </div>

      {!items && <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/5" />}
      {items && !items.length && <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{w.empty}</p>}

      {items && items.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {groups.map(([key, label, test]) => {
            const list = items.filter(test);
            if (!list.length) return null;
            return (
              <div key={key}>
                <p className={"mb-2 text-xs font-semibold uppercase tracking-wider " + (key === "overdue" ? "text-rose-300" : key === "today" ? "text-amber-300" : "text-gray-400")}>
                  {label} <span className="text-gray-600">({list.length})</span>
                </p>
                <ul className="space-y-2">
                  {list.map((i) => {
                    const [icon, chip] = TYPE[i.type] || TYPE.homework;
                    const to = linkFor ? linkFor(i) : null;
                    const body = (
                      <>
                        <span className="text-lg leading-none">{icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className={"block truncate text-sm font-medium " + (i.done ? "text-gray-500 line-through" : "")}>{i.title}</span>
                          <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                            <span className={"rounded-full px-1.5 py-0.5 " + chip}>{w[i.type]}</span>
                            {i.subject} · {fmt(i.date)}{i.minutes ? " · " + i.minutes + " " + w.min : ""}
                            {i.hasPicture && <span>· {w.picture}</span>}
                          </span>
                        </span>
                        {i.done ? <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
                          : i.overdue ? <AlertCircle size={17} className="shrink-0 text-rose-400" />
                          : to ? <ArrowRight size={15} className="shrink-0 text-gray-500" /> : null}
                      </>
                    );
                    const cls = "flex items-center gap-3 rounded-xl px-3 py-2.5 transition " +
                      (i.overdue ? "border border-rose-500/30 bg-rose-500/10" : "bg-black/20") + (to ? " hover:bg-white/[0.06]" : "");
                    return (
                      <li key={i.type + i._id}>
                        {to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}