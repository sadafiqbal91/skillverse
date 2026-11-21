import { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2, UserCircle2, ShieldCheck } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useAuth } from "../context/AuthContext";

const ROLE = { student: "Student", instructor: "Teacher", orgadmin: "Principal / Admin", parent: "Parent" };

function PassField({ label, show, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <input
        {...props}
        type={show ? "text" : "password"}
        required
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      />
    </label>
  );
}

export default function AccountPage() {
  const { user, organization } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const strength =
    form.next.length === 0 ? null
    : form.next.length < 6 ? { label: "Too short", color: "bg-rose-500", w: "25%" }
    : /\d/.test(form.next) && /[A-Za-z]/.test(form.next) && form.next.length >= 8
      ? { label: "Strong", color: "bg-emerald-500", w: "100%" }
      : { label: "Okay", color: "bg-amber-500", w: "60%" };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (form.next.length < 6) return setMsg({ type: "err", text: "New password must be at least 6 characters" });
    if (form.next !== form.confirm) return setMsg({ type: "err", text: "New passwords do not match" });
    if (form.next === form.current) return setMsg({ type: "err", text: "New password must be different from the current one" });

    setSaving(true);
    try {
      await api.patch("/users/me/password", {
        currentPassword: form.current,
        oldPassword: form.current,
        newPassword: form.next,
      });
      setMsg({ type: "ok", text: "Password changed. Use the new password next time you sign in." });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setMsg({ type: "err", text: errMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="mt-1 text-gray-400">Your profile and password.</p>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-xl font-bold text-white shadow-lg shadow-violet-900/40">
          {initials || <UserCircle2 />}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold">{user?.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-violet-300">{ROLE[user?.role]}</span>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-gray-300">{organization?.name}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound size={18} className="text-violet-300" /> Change password
          </h2>
          <button type="button" onClick={() => setShow((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
            {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? "Hide" : "Show"}
          </button>
        </div>

        <PassField label="Current password" name="current" show={show} value={form.current} onChange={onChange}
          placeholder="Your current or temporary password" />
        <div className="grid gap-4 sm:grid-cols-2">
          <PassField label="New password" name="next" show={show} value={form.next} onChange={onChange} placeholder="Min 6 characters" />
          <PassField label="Confirm new password" name="confirm" show={show} value={form.confirm} onChange={onChange} placeholder="Type again" />
        </div>

        {strength && (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.w }} />
            </div>
            <p className="mt-1 text-xs text-gray-400">Strength: {strength.label} (tip: 8+ characters with letters and numbers)</p>
          </div>
        )}

        {msg.text && (
          <p className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-300"
          }`}>
            {msg.type === "ok" && <CheckCircle2 size={16} />} {msg.text}
          </p>
        )}

        <button disabled={saving}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50 transition">
          {saving ? "Saving..." : "Update password"}
        </button>
      </form>

      <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
        <p>
          Your password is stored <b className="text-gray-200">encrypted</b>. Nobody, not even your principal, can see it.
          If you forget it, the principal can only give you a <b className="text-gray-200">temporary password</b>.
        </p>
      </div>
    </div>
  );
}