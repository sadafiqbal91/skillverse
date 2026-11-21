import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, UserPlus, KeyRound, Search, X, Copy } from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Card, Badge, Empty, Loading, ErrorBox } from "../../components/ui";

const input = "w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
const ROLE_BADGE = {
  instructor: ["Teacher", "bg-cyan-500/15 text-cyan-300"],
  student: ["Student", "bg-violet-500/15 text-violet-300"],
  parent: ["Parent", "bg-emerald-500/15 text-emerald-300"],
  orgadmin: ["Admin", "bg-amber-500/15 text-amber-300"],
};
const EMPTY = { role: "student", name: "", email: "", password: "", childEmails: "" };

export default function UsersPage() {
  const { organization } = useAuth();
  const head = organization?.type === "school" ? "Principal" : "Admin"; // school vs institute
  const ROLES = [["", "All"], ["instructor", "Teachers"], ["student", "Students"], ["parent", "Parents"], ["orgadmin", head]];

  const [params] = useSearchParams();
  const [users, setUsers] = useState(null);
  const [role, setRole] = useState("");
  const [q, setQ] = useState(params.get("q") || "");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [temp, setTemp] = useState(null);

  // Upar wale search se naya ?q= aaye
  useEffect(() => {
    setQ(params.get("q") || "");
  }, [params]);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (role) p.set("role", role);
    if (q.trim()) p.set("q", q.trim());
    api.get(`/users?${p}`).then((r) => setUsers(r.data.users)).catch((e) => setError(errMsg(e)));
  }, [role, q]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const flash = (text, bad = false) => { setMsg({ text, bad }); setTimeout(() => setMsg(null), 4000); };

  const create = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, childEmails: form.role === "parent" ? form.childEmails.split(",").map((s) => s.trim()).filter(Boolean) : undefined };
      const r = await api.post("/users", body);
      flash(r.data.message);
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (e2) {
      flash(errMsg(e2), true);
    }
  };

  const reset = async (u) => {
    if (!window.confirm(`Reset the password for ${u.name}?`)) return;
    try {
      const r = await api.patch(`/users/${u._id}/reset-password`);
      setTemp({ name: u.name, email: u.email, password: r.data.tempPassword });
    } catch (e) {
      flash(errMsg(e), true);
    }
  };

  if (error) return <ErrorBox text={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-gray-400">Add teachers, students and parents. Reset a forgotten password in one click.</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:opacity-90">
          {open ? <X size={16} /> : <UserPlus size={16} />} {open ? "Close" : "Add user"}
        </button>
      </div>

      {msg && <div className={`page-enter rounded-xl border px-4 py-3 text-sm ${msg.bad ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{msg.text}</div>}

      {temp && (
        <Card className="page-enter border-amber-500/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-amber-300"><KeyRound size={18} /> New password for {temp.name}</p>
              <p className="mt-1 text-sm text-gray-400">Email: {temp.email}</p>
              <p className="mt-2 font-mono text-2xl tracking-widest">{temp.password}</p>
              <p className="mt-2 text-xs text-gray-500">Share it privately. They can change it after logging in (⚙️ Settings).</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(temp.password)} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Copy"><Copy size={16} /></button>
              <button onClick={() => setTemp(null)} className="rounded-lg p-2 hover:bg-white/10"><X size={16} /></button>
            </div>
          </div>
        </Card>
      )}

      {open && (
        <Card title="Add a user" icon={UserPlus} className="page-enter">
          <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
            <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student" className="bg-[#12122a]">Student</option>
              <option value="instructor" className="bg-[#12122a]">Teacher</option>
              <option value="parent" className="bg-[#12122a]">Parent</option>
            </select>
            <input className={input} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={input} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className={input} placeholder="Password (min 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {form.role === "parent" && (
              <input className={`${input} md:col-span-2`} placeholder="Child's email (comma for more), e.g. hamza@cityschool.com" value={form.childEmails} onChange={(e) => setForm({ ...form, childEmails: e.target.value })} required />
            )}
            <button className="rounded-xl bg-violet-600 py-2.5 text-sm font-semibold hover:bg-violet-500 md:col-span-2">Add user</button>
          </form>
        </Card>
      )}

      <Card title="Everyone in your institute" icon={Users}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {ROLES.map(([k, l]) => (
              <button key={k} onClick={() => setRole(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${role === k ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input className={`${input} pl-9 pr-9`} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={15} /></button>
            )}
          </div>
        </div>

        {!users ? <Loading /> : !users.length ? <Empty text="No users found." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Email</th><th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Children</th><th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const [base, cls] = ROLE_BADGE[u.role] || [u.role, "bg-white/5"];
                  const label = u.role === "orgadmin" ? head : base;
                  return (
                    <tr key={u._id} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-2.5 font-medium">{u.name}</td>
                      <td className="py-2.5 text-gray-400">{u.email}</td>
                      <td className="py-2.5"><Badge className={cls}>{label}</Badge></td>
                      <td className="py-2.5 text-xs text-gray-400">{u.children?.length ? u.children.map((c) => c.name).join(", ") : "—"}</td>
                      <td className="py-2.5 text-right">
                        {u.role !== "orgadmin" && (
                          <button onClick={() => reset(u)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10">
                            <KeyRound size={13} /> Reset password
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}