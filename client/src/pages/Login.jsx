import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  GraduationCap, Presentation, Building2, Users, ArrowLeft,
  ChevronDown, KeyRound, School, Laptop, ShieldCheck, Eye, EyeOff, Sparkles,
} from "lucide-react";
import { useAuth, homeFor } from "../context/AuthContext";
import { errMsg } from "../api/api";


// Demo accounts: har institute ke apne roles (school vs computer institute)
const DEMO = [
  {
    // 🎭 Audience ke liye: yahan jo marzi karein, asli demo safe rehta hai
    id: "demo",
    school: "Demo Academy",
    icon: Sparkles,
    accounts: [
      { label: "Principal", who: "Mrs. Ayesha", icon: Building2, slug: "demo", email: "principal@demo.com", password: "demo123" },
      { label: "Teacher", who: "Mr. Bilal", icon: Presentation, slug: "demo", email: "teacher@demo.com", password: "demo123" },
      { label: "Student", who: "Ali Khan", icon: GraduationCap, slug: "demo", email: "student@demo.com", password: "demo123" },
      { label: "Parent", who: "Mr. Khan, Ali's father", icon: Users, slug: "demo", email: "parent@demo.com", password: "demo123" },
    ],
    // 🏫 Poori Class 5-A: kaun kya hai (audience ko kuch yaad nahi rakhna)
    people: [
      { title: "🏫 Principal", list: [
        { label: "Principal", who: "Mrs. Ayesha", note: "School Tree, plan, results", email: "principal@demo.com" },
      ] },
      { title: "👩‍🏫 Teachers", list: [
        { label: "Teacher", who: "Mr. Bilal", note: "Maths, Computer · ⭐ Class teacher 5-A", email: "teacher@demo.com" },
        { label: "Teacher", who: "Miss Hina", note: "Science, Urdu", email: "science@demo.com" },
        { label: "Teacher", who: "Miss Sana", note: "English, Social Studies", email: "english@demo.com" },
        { label: "Teacher", who: "Mr. Usman", note: "Islamiat", email: "islamiat@demo.com" },
      ] },
      { title: "🧒 Students", list: [
        { label: "Student", who: "Ali Khan", note: "🔴 Weak in Fractions", email: "student@demo.com" },
        { label: "Student", who: "Omar Shah", note: "🌱 Re-test ready, try it!", email: "omar@demo.com" },
        { label: "Student", who: "Sara Ahmed", note: "⭐ Top student", email: "sara@demo.com" },
        { label: "Student", who: "Fatima Noor", note: "🔮 Early warning", email: "fatima@demo.com" },
      ] },
      { title: "👨‍👩‍👧 Parents", list: [
        { label: "Parent", who: "Mr. Khan", note: "Ali's father", email: "parent@demo.com" },
        { label: "Parent", who: "Mrs. Noor", note: "Fatima's mother", email: "fatima.parent@demo.com" },
      ] },
    ],
  },
  {
    id: "school",
    school: "City School",
    icon: School,
    accounts: [
      { label: "Principal", who: "Mrs. Khan", icon: Building2, slug: "cityschool", email: "principal@cityschool.com", password: "admin123" },
      { label: "Teacher", who: "Miss Sana", icon: Presentation, slug: "cityschool", email: "sana@cityschool.com", password: "teach123" },
      { label: "Student", who: "Hamza Tariq", icon: GraduationCap, slug: "cityschool", email: "hamza@cityschool.com", password: "stud123" },
      { label: "Parent", who: "Mr. Tariq, Hamza's father", icon: Users, slug: "cityschool", email: "tariq@cityschool.com", password: "parent123" },
    ],
  },
  {
    id: "institute",
    school: "Aptech Karachi",
    icon: Laptop,
    accounts: [
      { label: "Admin", who: "Institute admin", icon: ShieldCheck, slug: "aptechkhi", email: "admin@aptech.com", password: "admin123" },
      { label: "Instructor", who: "Sir Ahmed", icon: Presentation, slug: "aptechkhi", email: "ahmed@aptech.com", password: "teach123" },
      { label: "Student", who: "Ali Raza", icon: GraduationCap, slug: "aptechkhi", email: "ali@aptech.com", password: "stud123" },
    ],
  },
];

function Field({ label, hint, type = "text", ...props }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <div className="relative mt-1.5">
        <input
          {...props}
          type={isPass && show ? "text" : type}
          required
          className={`w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 ${isPass ? "pr-10" : ""}`}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            title={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

export default function Login() {
  const { slug: urlSlug } = useParams();
  const [form, setForm] = useState({ slug: urlSlug || "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isDemoLink = urlSlug === "demo";
  const [demoOpen, setDemoOpen] = useState(isDemoLink);
  const [tab, setTab] = useState(isDemoLink ? "demo" : "school");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const group = DEMO.find((g) => g.id === tab);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickDemo = (acc) => {
    setForm({ slug: acc.slug, email: acc.email, password: acc.password });
    setError("");
    setPicked({ label: acc.label, who: acc.who, school: group.school, email: acc.email });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await login(form.slug.trim(), form.email.trim(), form.password);
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_60%)]">
      <Link
        to="/"
        className="absolute left-4 top-4 z-50 inline-flex sm:fixed sm:left-6 sm:top-6 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft size={16} /> Back to home
      </Link>

      <div className="w-full max-w-md page-enter pt-16 pb-10 sm:py-10">
        <Link to="/" className="group mb-7 block text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 mb-4 shadow-lg shadow-violet-900/50 transition group-hover:scale-105">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            SkillVerse
          </h1>
          <p className="text-gray-400 mt-1">Learn • Practice • Grow</p>
        </Link>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-6 space-y-4 shadow-2xl shadow-black/40"
        >
          <Field label="Institute code" name="slug" placeholder="e.g. aptechkhi" value={form.slug} onChange={onChange} />
          <Field label="Email" name="email" type="email" placeholder="you@institute.com" value={form.email} onChange={onChange} />
          <Field label="Password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={onChange} />

          <div className="-mt-1 text-right">
            <button type="button" onClick={() => setForgotOpen((v) => !v)}
              className="text-xs text-violet-300 hover:text-violet-200 transition">
              Forgot password?
            </button>
          </div>
          {forgotOpen && (
            <div className="flex gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2.5 text-xs text-violet-100 page-enter">
              <KeyRound size={16} className="mt-0.5 shrink-0 text-violet-300" />
              <p>
                Ask your <b>institute admin</b> to reset your password. They will give you a <b>temporary password</b>.
                After you sign in, change it from <b>⚙️ Settings</b>.
              </p>
            </div>
          )}

          {picked && !error && (
            <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              ✓ <b>{picked.who}</b> ({picked.label}) · {picked.school}. Now press Sign in.
            </p>
          )}
          {error && (
            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50 transition">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          New student?{" "}
          <Link to={form.slug ? `/register/${form.slug}` : "/register"} className="font-medium text-violet-300 hover:text-violet-200">
            Create an account
          </Link>
        </p>
                <p className="mt-2 text-center text-xs text-gray-500">
          Run a school or institute?{" "}
          <Link to="/start" className="font-medium text-cyan-300 hover:text-cyan-200">Register your institute →</Link>
        </p>

        {/* Demo: tabs per institute + ek line roles */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02]">
          <button type="button" onClick={() => setDemoOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white transition">
            <span>Try a demo account</span>
            <ChevronDown size={16} className={`transition-transform ${demoOpen ? "rotate-180" : ""}`} />
          </button>

          {demoOpen && (
            <div className="border-t border-white/10 p-3 page-enter">
              {/* Institute tabs */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/30 p-1">
                {DEMO.map(({ id, school, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => { setTab(id); setPicked(null); }}
                    className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition sm:text-xs ${
                      tab === id ? "bg-violet-600 text-white shadow" : "text-gray-400 hover:text-white"
                    }`}>
                    <Icon size={14} /> {school}
                  </button>
                ))}
              </div>

              {tab === "demo" && (
                <p className="mt-2 text-center text-[11px] text-cyan-300">🎭 Class 5-A · tap anyone, then press Sign in · password <b>demo123</b></p>
              )}

              {/* 🏫 Demo Academy: poori class, naam + kaun hai */}
              {group.people ? (
                <div className="mt-2.5 max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {group.people.map((g) => (
                    <div key={g.title}>
                      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{g.title}</p>
                      <div className="space-y-1">
                        {g.list.map((p) => {
                          const active = picked?.email === p.email && picked?.school === group.school;
                          return (
                            <button key={p.email} type="button" onClick={() => pickDemo({ ...p, slug: "demo", password: "demo123" })}
                              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                                active ? "border-violet-500 bg-violet-500/15 text-white" : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10 hover:text-white"
                              }`}>
                              <span className="font-semibold">{p.who}</span>
                              <span className="text-right text-[11px] text-gray-400">{p.note}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              /* Roles: ek hi line */
              <div className="mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${group.accounts.length}, minmax(0, 1fr))` }}>
                {group.accounts.map((acc) => {
                  const Icon = acc.icon;
                  const active = picked?.label === acc.label && picked?.school === group.school;
                  return (
                    <button key={acc.label} type="button" title={acc.who} onClick={() => pickDemo(acc)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs transition ${
                        active
                          ? "border-violet-500 bg-violet-500/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10 hover:text-white"
                      }`}>
                      <Icon size={16} className="text-violet-300" />
                      {acc.label}
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}