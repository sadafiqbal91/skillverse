import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, XCircle, GraduationCap, Laptop, School, Landmark, Globe, Eye, EyeOff } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useAuth } from "../context/AuthContext";

const TYPES = [
  { key: "school", label: "School", icon: School },
  { key: "computer_institute", label: "Computer Institute", icon: Laptop },
  { key: "college", label: "College", icon: Building2 },
  { key: "university", label: "University", icon: Landmark },
  { key: "online_academy", label: "Online Academy", icon: Globe },
];

const toSlug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
const input = "mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

export default function RegisterInstitute() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", slug: "", type: "school", adminName: "", adminEmail: "", adminPassword: "" });
  const [slugEdited, setSlugEdited] = useState(false);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Naam se code khud bane (jab tak user khud na badle)
  const setName = (name) => setF((x) => ({ ...x, name, slug: slugEdited ? x.slug : toSlug(name) }));

  // Code free hai? (thoda ruk ke check)
  useEffect(() => {
    if (!f.slug) {
      setCheck(null);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/organizations/check/${f.slug}`).then((r) => setCheck(r.data)).catch(() => setCheck(null));
    }, 350);
    return () => clearTimeout(t);
  }, [f.slug]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const r = await api.post("/organizations/register", f);
      startSession(r.data);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_60%)]">
      <Link to="/login" className="fixed left-6 top-6 z-50 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 backdrop-blur hover:bg-white/10 hover:text-white">
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <div className="w-full max-w-xl page-enter py-12">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 mb-4 shadow-lg shadow-violet-900/50">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Bring your institute to SkillVerse</h1>
          <p className="mt-1 text-gray-400">Set up in 2 minutes. No installation.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur shadow-2xl shadow-black/40">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-300">1. What kind of institute?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" onClick={() => setF({ ...f, type: key })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    f.type === key ? "border-violet-500 bg-violet-500/15 text-white" : "border-white/10 bg-black/20 text-gray-400 hover:text-white"
                  }`}>
                  <Icon size={16} className="text-violet-300" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-300">2. Institute details</p>
            <label className="block text-xs text-gray-400">Institute name
              <input className={input} value={f.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beaconhouse Gulshan" required />
            </label>
            <label className="mt-3 block text-xs text-gray-400">Institute code (used to sign in)
              <input className={input} value={f.slug} required placeholder="e.g. beaconhouse-gulshan"
                onChange={(e) => { setSlugEdited(true); setF({ ...f, slug: toSlug(e.target.value) }); }} />
            </label>
            {check && (
              <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${check.available ? "text-emerald-300" : "text-rose-300"}`}>
                {check.available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {check.available ? `Available · your link: ${window.location.origin}/login/${f.slug}` : check.reason}
              </p>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-300">3. Your admin account (Principal / Admin)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-gray-400">Your name
                <input className={input} value={f.adminName} onChange={(e) => setF({ ...f, adminName: e.target.value })} required />
              </label>
              <label className="block text-xs text-gray-400">Email
                <input className={input} type="email" value={f.adminEmail} onChange={(e) => setF({ ...f, adminEmail: e.target.value })} required />
              </label>
            </div>
            <label className="mt-3 block text-xs text-gray-400">Password (min 6)
              <div className="relative">
                <input className={`${input} pr-10`} type={showPw ? "text" : "password"} value={f.adminPassword}
                  onChange={(e) => setF({ ...f, adminPassword: e.target.value })} required />
                <button type="button" onClick={() => setShowPw((s) => !s)} title={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-gray-500 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          {error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

          <button disabled={saving || (check && !check.available)}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 font-semibold hover:opacity-90 disabled:opacity-50">
            {saving ? "Setting up..." : "Create my institute 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}