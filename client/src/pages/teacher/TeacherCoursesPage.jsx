import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Plus, Layers, Users, ArrowRight, X } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { Card, Badge, Empty, Loading, ErrorBox } from "../../components/ui";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

export default function TeacherCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", topics: "" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    api.get("/courses?mine=true").then((r) => setCourses(r.data.courses)).catch((e) => setError(errMsg(e)));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr("");
    try {
      const topics = form.topics.split(",").map((t) => t.trim()).filter(Boolean);
      const r = await api.post("/courses", { title: form.title, description: form.description, topics });
      navigate(`/teacher/courses/${r.data.course._id}`);
    } catch (e2) {
      setFormErr(errMsg(e2));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorBox text={error} />;
  if (!courses) return <Loading />;

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="mt-1 text-gray-400">Build your syllabus once. Use it every year.</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:opacity-90">
          {open ? <X size={16} /> : <Plus size={16} />} {open ? "Close" : "New course"}
        </button>
      </div>

      {open && (
        <Card title="Create a course" icon={Plus} className="page-enter">
          <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
            <input className={input} placeholder="Course title, e.g. Maths Class 5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className={input} placeholder="Topics, comma separated: Fractions, Decimals" value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
            <textarea className={`${input} md:col-span-2`} rows={2} placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {formErr && <p className="text-sm text-rose-300 md:col-span-2">{formErr}</p>}
            <button disabled={saving} className="rounded-xl bg-violet-600 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50 md:col-span-2">
              {saving ? "Creating..." : "Create course (saved as draft)"}
            </button>
          </form>
        </Card>
      )}

      {!courses.length ? (
        <Card><Empty text="No courses yet. Click 'New course' to create your first one." /></Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 stagger">
          {courses.map((c) => (
            <Card key={c._id} className="flex flex-col">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><BookOpen size={20} /></div>
                <Badge className={c.status === "published" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-gray-300"}>
                  {c.status === "published" ? "Published" : "Draft"}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-400">{c.description || "No description yet."}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(c.topics || []).map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400">{t}</span>)}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Layers size={13} /> {c.lessonCount} lessons</span>
                <span className="flex items-center gap-1"><Users size={13} /> {c.studentCount} students</span>
              </div>
              <Link to={`/teacher/courses/${c._id}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm font-medium hover:bg-white/20">
                Open builder <ArrowRight size={14} />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}