import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  GraduationCap, Presentation, Building2, Users, ArrowLeft,
  ChevronDown, KeyRound, School, Laptop, ShieldCheck, Eye, EyeOff, Sparkles,
} from "lucide-react";
import { useAuth, homeFor } from "../context/AuthContext";
import { errMsg } from "../api/api";


// 🎭 Demo Academy: audience ke liye (City School / Aptech ke password ab public nahi)
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
    // 🧒 Ek hi bachche (Ali) ki poori duniya: wo, uske walid, uske SAB teachers, uski principal
    story: [
      { title: "🧒 The student", list: [
        { label: "Student", who: "Ali Khan", note: "Class 5-A · 7 subjects", email: "student@demo.com" },
      ] },
      { title: "👨‍👩‍👧 Ali's parent", list: [
        { label: "Parent", who: "Mr. Khan", note: "Ali's father", email: "parent@demo.com" },
      ] },
      { title: "👩‍🏫 Ali's teachers", list: [
        { label: "Teacher", who: "Mr. Bilal", note: "Maths, Computer · ⭐ class teacher", email: "teacher@demo.com" },
        { label: "Teacher", who: "Miss Hina", note: "Science, Urdu", email: "science@demo.com" },
        { label: "Teacher", who: "Miss Sana", note: "English, Social Studies", email: "english@demo.com" },
        { label: "Teacher", who: "Mr. Usman", note: "Islamiat", email: "islamiat@demo.com" },
      ] },
      { title: "🏫 Ali's school", list: [
        { label: "Principal", who: "Mrs. Ayesha", note: "Principal · sees the whole school", email: "principal@demo.com" },
      ] },
    ],
  },
  {
    // 🔒 Private: sirf naam aur roles nazar aate hain, email + password khud likhna hoga
    id: "school",
    school: "City School",
    icon: School,
    private: true,
    accounts: [
      { label: "Principal", icon: Building2, slug: "cityschool" },
      { label: "Teacher", icon: Presentation, slug: "cityschool" },
      { label: "Student", icon: GraduationCap, slug: "cityschool" },
      { label: "Parent", icon: Users, slug: "cityschool" },
    ],
  },
  {
    id: "institute",
    school: "Aptech Karachi",
    icon: Laptop,
    private: true,
    accounts: [
      { label: "Admin", icon: ShieldCheck, slug: "aptechkhi" },
      { label: "Instructor", icon: Presentation, slug: "aptechkhi" },
      { label: "Student", icon: GraduationCap, slug: "aptechkhi" },
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
  const [tab, setTab] = useState("demo");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [privateRole, setPrivateRole] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const group = DEMO.find((g) => g.id === tab);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickDemo = (acc) => {
    setForm({ slug: acc.slug, email: acc.email, password: acc.password });
    setError("");
    setPicked({ label: acc.label, who: acc.who, school: group.school, email: acc.email });
    setPrivateRole(null);
    setDemoOpen(false); // ✅ chun liya: dabba band, seedha Sign in
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 🔒 Private institute: sirf code bharo, email + password user khud likhe
  const pickPrivate = (acc) => {
    setForm({ slug: acc.slug, email: "", password: "" });
    setError("");
    setPicked(null);
    setPrivateRole({ label: acc.label, school: group.school });
    setDemoOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 👤 Ek shakhs ka button: naam + wo kaun hai
  const PersonBtn = ({ p }) => {
    const active = picked?.email === p.email;
    return (
      <button type="button" onClick={() => pickDemo({ ...p, slug: "demo", password: "demo123" })}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
          active ? "border-violet-500 bg-violet-500/15 text-white" : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10 hover:text-white"
        }`}>
        <span className="font-semibold">{p.who}</span>
        <span className="text-right text-[11px] text-gray-400">{p.note}</span>
      </button>
    );
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
          {privateRole && !picked && !error && (
            <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              🔒 <b>{privateRole.school}</b> ({privateRole.label}) is a private institute. Please type your own email and password.
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

        {/* 🎭 Aam login par sirf chhota sa link; poora demo dabba sirf /login/demo (QR) par */}
        {!isDemoLink && (
          <p className="mt-5 text-center text-xs text-gray-500">
            Just looking around?{" "}
            <Link to="/login/demo" onClick={() => { setTab("demo"); setDemoOpen(true); setForm((f) => ({ ...f, slug: "demo" })); }} className="font-medium text-violet-300 hover:text-violet-200">🎭 Try the demo school →</Link>
          </p>
        )}

        {/* Demo: tabs per institute + ek line roles */}
        {isDemoLink && (
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
                  <button key={id} type="button" onClick={() => { setTab(id); setPicked(null); setPrivateRole(null); }}
                    className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition sm:text-xs ${
                      tab === id ? "bg-violet-600 text-white shadow" : "text-gray-400 hover:text-white"
                    }`}>
                    <Icon size={14} /> {school}
                  </button>
                ))}
              </div>

              {!group.private ? (
                <>
                  <p className="mt-2 text-center text-[11px] text-cyan-300">🎭 Meet Ali and everyone around him · tap a person, then Sign in · password <b>demo123</b></p>
                  <div className="mt-2.5 space-y-2.5">
                    {group.story.map((g) => (
                      <div key={g.title}>
                        <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{g.title}</p>
                        <div className="space-y-1">
                          {g.list.map((p) => <PersonBtn key={p.email} p={p} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-center text-[11px] text-amber-200">🔒 Private institute · pick a role, then type your own email and password</p>
                  <div className="mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${group.accounts.length}, minmax(0, 1fr))` }}>
                    {group.accounts.map((acc) => {
                      const Icon = acc.icon;
                      return (
                        <button key={acc.label} type="button" onClick={() => pickPrivate(acc)}
                          className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-1 py-2 text-xs text-gray-300 transition hover:bg-white/10 hover:text-white">
                          <Icon size={16} className="text-violet-300" />
                          {acc.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}