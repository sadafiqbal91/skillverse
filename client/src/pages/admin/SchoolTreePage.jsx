import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Network, Plus, Pencil, Trash2, X, GraduationCap, CalendarDays, Clock, BookOpen, Users } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

// 🌳 Ek hi feature, har institute ki apni zubaan
export const WORDS = {
  school: { group: "Class", groups: "classes", lead: "Class teacher", item: "Subject", title: "School Tree", eg: "Class 5-A" },
  college: { group: "Section", groups: "sections", lead: "Section in-charge", item: "Subject", title: "Sections", eg: "1st Year - A" },
  university: { group: "Section", groups: "sections", lead: "Coordinator", item: "Course", title: "Sections", eg: "BSCS Semester 3" },
  computer_institute: { group: "Batch", groups: "batches", lead: "Batch coordinator", item: "Course", title: "Batches", eg: "Web Dev Morning" },
  online_academy: { group: "Batch", groups: "batches", lead: "Batch coordinator", item: "Course", title: "Batches", eg: "Evening Batch" },
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-violet-500";
const ago = (d) => {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return Math.max(m, 1) + "m ago";
  const h = Math.floor(m / 60);
  return h < 24 ? h + "h ago" : Math.floor(h / 24) + "d ago";
};

function ClassForm({ w, data, initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [lead, setLead] = useState(initial?.classTeacher?._id || "");
  const [picked, setPicked] = useState(new Set((initial?.courseIds || []).map(String)));
  const [rows, setRows] = useState(initial?.timetable?.map((t) => ({ day: t.day, time: t.time, courseId: String(t.courseId) })) || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (id) => {
    const n = new Set(picked);
    if (n.has(id)) n.delete(id); else n.add(id);
    setPicked(n);
  };
  const subjects = data.courses.filter((c) => picked.has(String(c._id)));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const body = {
      name, classTeacherId: lead || null, courseIds: [...picked],
      timetable: rows.filter((r) => r.courseId && picked.has(r.courseId) && r.time),
    };
    try {
      if (initial) await api.patch("/classes/" + initial._id, body);
      else await api.post("/classes", body);
      onSaved();
    } catch (e2) {
      setErr(errMsg(e2));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-5 page-enter">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{initial ? "Edit " + initial.name : "New " + w.group.toLowerCase()}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-gray-400">{w.group} name
          <input className={input + " mt-1"} value={name} onChange={(e) => setName(e.target.value)} placeholder={"e.g. " + w.eg} required />
        </label>
        <label className="text-sm text-gray-400">{w.lead}
          <select className={input + " mt-1"} value={lead} onChange={(e) => setLead(e.target.value)}>
            <option value="">Choose a teacher</option>
            {data.teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm text-gray-400">{w.item}s in this {w.group.toLowerCase()}</p>
        {!data.courses.length && <p className="text-xs text-gray-500">No {w.item.toLowerCase()}s yet. Teachers create them first.</p>}
        <div className="flex flex-wrap gap-2">
          {data.courses.map((c) => {
            const on = picked.has(String(c._id));
            return (
              <button type="button" key={c._id} onClick={() => toggle(String(c._id))}
                className={"rounded-xl border px-3 py-2 text-left text-xs transition " + (on ? "border-violet-500 bg-violet-500/15 text-white" : "border-white/10 bg-black/20 text-gray-400 hover:text-white")}>
                <span className="block font-semibold">{on ? "✓ " : ""}{c.title}</span>
                <span className="text-[11px] text-gray-500">{c.teacher}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-gray-400">🗓️ Timetable</p>
          <button type="button" disabled={!subjects.length}
            onClick={() => setRows([...rows, { day: "Mon", time: "08:30", courseId: String(subjects[0]._id) }])}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20 disabled:opacity-40">
            <Plus size={13} /> Add period
          </button>
        </div>
        {!rows.length && <p className="text-xs text-gray-500">No periods yet. Pick {w.item.toLowerCase()}s above, then add periods.</p>}
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[80px_100px_1fr_auto] gap-2">
              <select className={input} value={r.day} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, day: e.target.value } : x)))}>
                {DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <input type="time" className={input} value={r.time} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, time: e.target.value } : x)))} />
              <select className={input} value={r.courseId} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, courseId: e.target.value } : x)))}>
                {subjects.map((s) => <option key={s._id} value={String(s._id)}>{s.title}</option>)}
              </select>
              <button type="button" onClick={() => setRows(rows.filter((_, k) => k !== i))} className="rounded-lg px-2 text-gray-500 hover:bg-rose-500/10 hover:text-rose-300"><X size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}
      <button disabled={saving} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {saving ? "Saving..." : initial ? "Save changes" : "Create " + w.group.toLowerCase()}
      </button>
    </form>
  );
}

export function ClassCard({ k, w, onEdit, onDelete, readOnly = false }) {
  const [tab, setTab] = useState("subjects");
  const byDay = DAYS.map((d) => [d, k.timetable.filter((t) => t.day === d)]).filter(([, list]) => list.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-violet-600/15 to-transparent p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">📚 {k.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-300">
            <GraduationCap size={15} className="text-violet-300" /> {w.lead}: <b>{k.classTeacher?.name || "Not set"}</b>
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300"><Users size={12} className="mr-1 inline" />{k.totals.students} students</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-gray-300"><BookOpen size={12} className="mr-1 inline" />{k.subjects.length} {w.item.toLowerCase()}s</span>
            {k.totals.warnings > 0 && <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-orange-300">🔮 {k.totals.warnings} early warning</span>}
            {k.totals.needHelp > 0 && <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-300">🙋 {k.totals.needHelp} need help</span>}
            {k.totals.quietThisWeek > 0 && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300">⚠️ {k.totals.quietThisWeek} with no work this week</span>}
          </div>
        </div>
        {!readOnly && <div className="flex gap-1.5">
          <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"><Pencil size={13} /> Edit</button>
          <button onClick={onDelete} className="rounded-lg px-2 py-1.5 text-gray-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={15} /></button>
        </div>}
      </div>

      <div className="flex gap-1 border-b border-white/10 px-4 pt-3 text-sm">
        {[["subjects", w.item + "s"], ["timetable", "🗓️ Timetable"], ["updates", "🕒 Latest"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={"rounded-t-lg px-3 py-2 font-medium transition " + (tab === key ? "bg-white/10 text-white" : "text-gray-400 hover:text-white")}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "subjects" && (
          !k.subjects.length ? <p className="text-sm text-gray-500">No {w.item.toLowerCase()}s yet. Press Edit to add them.</p> : (
            <ul className="space-y-2">
              {k.subjects.map((s) => (
                <li key={s._id}>
                  <Link to={readOnly ? "#" : "/admin/results?course=" + s._id} onClick={(e) => readOnly && e.preventDefault()}
                    className={"flex flex-wrap items-center gap-3 rounded-xl bg-black/20 px-4 py-3 transition " + (readOnly ? "cursor-default" : "hover:bg-white/5")}>
                    <span className="min-w-[140px] flex-1">
                      <span className="block font-medium">{s.title}</span>
                      <span className="text-xs text-gray-500">👩‍🏫 {s.teacher}</span>
                    </span>
                    {s.thisWeek && (s.thisWeek.homework || s.thisWeek.quizzes ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                        ✅ This week:{s.thisWeek.homework ? " 📝 " + s.thisWeek.homework : ""}{s.thisWeek.quizzes ? " 🧠 " + s.thisWeek.quizzes : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">⚠️ No work this week</span>
                    ))}
                    <span className="text-xs text-gray-400">{s.students} students</span>
                    {s.warnings > 0 && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-300">🔮 {s.warnings}</span>}
                    {s.needHelp > 0 && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">🙋 {s.needHelp}</span>}
                    {s.status !== "published" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-400">Draft</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "timetable" && (
          !byDay.length ? <p className="text-sm text-gray-500">No timetable yet. Press Edit to add periods.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byDay.map(([day, list]) => (
                <div key={day} className="rounded-xl bg-black/20 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300"><CalendarDays size={13} /> {day}</p>
                  <ul className="space-y-1.5">
                    {list.map((t, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={11} />{t.time}</span>
                        <span className="font-medium">{t.subject}</span>
                        <span className="truncate text-xs text-gray-500">· {t.teacher}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "updates" && (
          !k.updates.length ? <p className="text-sm text-gray-500">No updates yet.</p> : (
            <ul className="space-y-2">
              {k.updates.map((u, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-black/20 px-4 py-2.5 text-sm">
                  <span>{u.icon}</span>
                  <span className="flex-1">
                    <span className="block">{u.text}</span>
                    <span className="text-xs text-gray-500">{u.subject} · {ago(u.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

export default function SchoolTreePage() {
  const { organization } = useAuth();
  const w = WORDS[organization?.type] || WORDS.school;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // null | "new" | class object

  const load = useCallback(() => {
    api.get("/classes").then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (k) => {
    if (!window.confirm("Delete " + k.name + "? The " + w.item.toLowerCase() + "s themselves will stay.")) return;
    try {
      await api.delete("/classes/" + k._id);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (error && !data) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" />;

  const free = data.courses.filter((c) => !c.inClass);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight"><Network className="text-violet-400" /> {w.title}</h1>
          <p className="mt-1 text-gray-400">
            Every {w.group.toLowerCase()}, its {w.lead.toLowerCase()}, each {w.item.toLowerCase()} and its teacher, the timetable, and who did what.
          </p>
        </div>
        {!form && (
          <button onClick={() => setForm("new")} className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:opacity-90">
            <Plus size={16} /> New {w.group.toLowerCase()}
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

      {form && (
        <ClassForm w={w} data={data} initial={form === "new" ? null : form}
          onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      )}

      {!data.classes.length && !form && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Network className="mx-auto h-10 w-10 text-violet-400" />
          <p className="mt-3 font-semibold">No {w.groups} yet</p>
          <p className="mt-1 text-sm text-gray-400">Create your first {w.group.toLowerCase()} (e.g. {w.eg}), pick its {w.lead.toLowerCase()} and {w.item.toLowerCase()}s.</p>
        </div>
      )}

      <div className="space-y-6">
        {data.classes.map((k) => (
          <ClassCard key={k._id} k={k} w={w} onEdit={() => setForm(k)} onDelete={() => remove(k)} />
        ))}
      </div>

      {data.classes.length > 0 && free.length > 0 && (
        <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-gray-400">
          📌 Not in any {w.group.toLowerCase()} yet: {free.map((c) => c.title).join(", ")}
        </p>
      )}
    </div>
  );
}