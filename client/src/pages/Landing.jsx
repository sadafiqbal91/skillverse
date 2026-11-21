import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, Brain, Search, Sprout, FileText, CheckCircle2 } from "lucide-react";
import FeatureGallery from "../components/FeatureGallery";
import { useAuth, homeFor } from "../context/AuthContext";

const STEPS = [
  { icon: Brain, title: "Quiz", text: "Students take quizzes. Grading happens on the server." },
  { icon: Search, title: "Detect", text: "SkillVerse finds the exact weak topic, not just a score." },
  { icon: Sprout, title: "Re-test", text: "A short re-test filters out a bad day automatically." },
  { icon: FileText, title: "Teacher notes", text: "Still weak? The teacher sends notes once, to everyone who needs them." },
  { icon: CheckCircle2, title: "Proof", text: "A final re-test proves the problem is solved." },
];

const TYPES = ["Schools", "Colleges", "Universities", "Computer Institutes", "Online Academies"];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.28),transparent_55%)]">
      {/* Navbar */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">SkillVerse</span>
        </div>
        {user ? (
          <Link to={homeFor(user.role)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">Open dashboard</Link>
        ) : (
          <Link to="/login" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">Sign in</Link>
        )}
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-4xl px-6 pt-10 text-center page-enter">
        <span className="inline-block rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          Learning Management + Smart Assessment
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Find where students struggle.
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Fix it before the exam.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
          Other apps tell you a student scored 60%. SkillVerse tells you which topic they're stuck on, and helps them out of it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-semibold hover:opacity-90">
            Try the live demo <ArrowRight size={18} />
          </Link>
          <a href="#how" className="rounded-xl border border-white/15 px-6 py-3 font-semibold hover:bg-white/5">How it works</a>
        </div>
      </header>

      {/* 🌀 3D gallery */}
      <section className="mx-auto mt-6 max-w-6xl px-6">
        <FeatureGallery />
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto mt-24 max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">The Smart Intervention Loop</h2>
        <p className="mt-2 text-center text-gray-400">Like a doctor: measure, find the cause, treat, and check again.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-5 stagger">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-violet-500/30">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 font-bold text-violet-300">{i + 1}</span>
                Step
              </div>
              <s.icon size={26} className="mt-4 text-cyan-300" />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Institutes */}
      <section className="mx-auto mt-24 max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">One platform. Every institute.</h2>
        <p className="mt-2 text-gray-400">Each institute gets its own private space with settings that fit how it teaches.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {TYPES.map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">{t}</span>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-white/[0.06] py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SkillVerse • Learn • Practice • Grow
      </footer>
    </div>
  );
}