import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { GraduationCap, ArrowLeft, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/api";

function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <input
        {...props}
        required
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      />
      {hint && <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

export default function Register() {
  const { slug: urlSlug } = useParams();
  const [form, setForm] = useState({ slug: urlSlug || "", name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");

    setLoading(true);
    try {
      await register(form.slug.trim(), form.name.trim(), form.email.trim(), form.password);
      navigate("/student", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_60%)]">
      <Link
        to="/login"
        className="fixed left-6 top-6 z-50 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <div className="w-full max-w-md page-enter py-10">
        <Link to="/" className="group mb-6 block text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 mb-4 shadow-lg shadow-violet-900/50 transition group-hover:scale-105">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Create student account
          </h1>
          <p className="text-gray-400 mt-1">Join your institute on SkillVerse</p>
        </Link>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-6 space-y-4 shadow-2xl shadow-black/40"
        >
          <Field label="Institute code" name="slug" placeholder="e.g. aptechkhi" value={form.slug} onChange={onChange}
            hint="Your institute gives you this code." />
          <Field label="Full name" name="name" placeholder="e.g. Sara Khan" value={form.name} onChange={onChange} />
          <Field label="Email" name="email" type="email" placeholder="you@email.com" value={form.email} onChange={onChange} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Password" name="password" type="password" placeholder="Min 6 characters" value={form.password} onChange={onChange} />
            <Field label="Confirm" name="confirm" type="password" placeholder="Type again" value={form.confirm} onChange={onChange} />
          </div>

          <div className="flex gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100">
            <Info size={16} className="mt-0.5 shrink-0 text-cyan-300" />
            <p>Only <b>students</b> can sign up here. Teacher and parent accounts are created by your institute admin.</p>
          </div>

          {error && (
            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-violet-300 hover:text-violet-200">Sign in</Link>
        </p>
      </div>
    </div>
  );
}