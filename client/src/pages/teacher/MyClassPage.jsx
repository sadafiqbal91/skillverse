import { useEffect, useState } from "react";
import { Users, CalendarDays, Clock } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { ClassCard, WORDS } from "../admin/SchoolTreePage";

// 👩‍🏫 My Class (class teacher) + 🗓️ My Timetable (har teacher)
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MyClassPage() {
  const { organization } = useAuth();
  const w = WORDS[organization?.type] || WORDS.school;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/classes/mine").then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" />;

  const byDay = DAYS.map((d) => [d, data.timetable.filter((t) => t.day === d)]).filter(([, l]) => l.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight"><Users className="text-violet-400" /> My {w.group}</h1>
        <p className="mt-1 text-gray-400">
          Your timetable, and if you are a {w.lead.toLowerCase()}, how every {w.item.toLowerCase()} in your {w.group.toLowerCase()} is doing this week.
        </p>
      </div>

      {/* 🗓️ Mera timetable */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays size={18} className="text-cyan-300" /> 🗓️ My Timetable</h2>
        {!byDay.length ? (
          <p className="text-sm text-gray-500">No periods yet. The principal adds them in the {w.title}.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byDay.map(([day, list]) => (
              <div key={day} className="rounded-xl bg-black/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-300">{day}</p>
                <ul className="space-y-1.5">
                  {list.map((t, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={11} />{t.time}</span>
                      <span className="font-medium">{t.subject}</span>
                      <span className="text-xs text-gray-500">· {t.className}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📚 Meri class (class teacher) */}
      {data.classes.length ? (
        data.classes.map((k) => <ClassCard key={k._id} k={k} w={w} readOnly />)
      ) : (
        <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
          You are not a {w.lead.toLowerCase()} yet. When the principal makes you one, your {w.group.toLowerCase()} shows up here.
        </p>
      )}
    </div>
  );
}