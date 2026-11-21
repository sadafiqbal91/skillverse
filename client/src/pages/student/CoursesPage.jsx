import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; // ✨ NEW: useSearchParams
import { Search, BookOpen, UserRound, Layers, ArrowRight, X, CheckCircle2 } from "lucide-react";
import api from "../../api/api";

export const COVERS = [
  "from-violet-600 to-indigo-600",
  "from-sky-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-fuchsia-600 to-purple-700",
];
export const coverFor = (id = "") => COVERS[parseInt(String(id).slice(-4), 16) % COVERS.length];
const msg = (e) => e.response?.data?.message || "Something went wrong";

function CourseCard({ c, q, onOpen, onEnroll, busy }) {
  const s = q.trim().toLowerCase();
  const done = c.enrollmentStatus === "completed";
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-900/20">
      <div onClick={onOpen} className={`relative h-28 cursor-pointer bg-gradient-to-br ${coverFor(c._id)} p-4`}>
        <BookOpen className="absolute right-4 top-4 h-10 w-10 text-white/25 transition duration-300 group-hover:rotate-6 group-hover:scale-110" />
        {done && (
          <span className="absolute left-4 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        )}
        <h3 className="absolute bottom-3 left-4 right-4 text-lg font-semibold text-white drop-shadow">{c.title}</h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-2 text-sm text-slate-400">{c.description || "No description yet."}</p>
        <div className="flex flex-wrap gap-1.5">
          {(c.topics || []).map((t) => {
            const hit = s && t.toLowerCase().includes(s);
            return (
              <span key={t} className={`rounded-full px-2 py-0.5 text-xs transition ${hit ? "bg-violet-500 text-white" : "bg-white/5 text-slate-400"}`}>
                {t}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{c.instructorId?.name || "Instructor"}</span>
          <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{c.lessonCount} lessons</span>
        </div>

        <div className="mt-auto pt-1">
          {c.enrolled ? (
            <>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>Progress</span><span>{c.progressPercent}%</span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${c.progressPercent}%` }} />
              </div>
              <button onClick={onOpen} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                {done ? "Review course" : "Continue learning"} <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button onClick={onEnroll} disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? "Enrolling..." : "Enroll for free"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams(); // ✨ NEW
  const [courses, setCourses] = useState(null);
  const [q, setQ] = useState(params.get("q") || ""); // ✨ NEW: URL se search lo
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get("/courses").then((r) => setCourses(r.data.courses)).catch((e) => setError(msg(e)));
  }, []);

  // ✨ NEW: upar wale search bar se naya ?q= aaye to box update ho
  useEffect(() => {
    setQ(params.get("q") || "");
  }, [params]);

  // ✨ NEW: box mein likho ya ❌ dabao to URL bhi saath update ho
  const changeQ = (value) => {
    setQ(value);
    setParams(value.trim() ? { q: value } : {}, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!courses) return [];
    const s = q.trim().toLowerCase();
    if (!s) return courses;
    return courses.filter((c) =>
      [c.title, c.description, c.instructorId?.name, ...(c.topics || [])].join(" ").toLowerCase().includes(s)
    );
  }, [courses, q]);

  const mine = filtered.filter((c) => c.enrolled);
  const explore = filtered.filter((c) => !c.enrolled);

  const enroll = async (c) => {
    setBusy(c._id);
    try {
      await api.post(`/courses/${c._id}/enroll`);
      nav(`/student/courses/${c._id}`);
    } catch (e) {
      setError(msg(e));
      setBusy(null);
    }
  };

  const grid = (list) => (
    <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((c) => (
        <CourseCard key={c._id} c={c} q={q} busy={busy === c._id}
          onOpen={() => nav(`/student/courses/${c._id}`)} onEnroll={() => enroll(c)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Courses</h1>
          <p className="text-sm text-slate-400">Search any course or topic, enroll, and start learning.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => changeQ(e.target.value)} placeholder="Search: Python, JWT, Hooks..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500/60 focus:bg-white/10" />
          {q && (
            <button onClick={() => changeQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

      {!courses ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
          No course matches "<span className="text-white">{q}</span>". Try another topic.
          <div className="mt-3">
            <button onClick={() => changeQ("")} className="text-sm text-violet-300 hover:text-violet-200">
              Show all courses
            </button>
          </div>
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Continue learning</h2>
              {grid(mine)}
            </section>
          )}
          {explore.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Explore</h2>
              {grid(explore)}
            </section>
          )}
        </>
      )}
    </div>
  );
}