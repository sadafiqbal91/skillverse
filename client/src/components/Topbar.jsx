import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bell, Search, LogOut, Menu, Settings, ArrowRight, BookOpen, UserRound } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import ChildModeBar from "./ChildModeBar";

const ago = (date) => {
  const m = Math.floor((Date.now() - new Date(date)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const ROLE = { student: "Student", instructor: "Teacher", orgadmin: "Admin", parent: "Parent" };
const ROLE_LABEL = { student: "Student", instructor: "Teacher", orgadmin: "Admin", parent: "Parent" };

// Page shortcuts
const PAGES = {
  student: [
    { label: "Dashboard", to: "/student", keys: ["dashboard", "home"] },
    { label: "My Courses", to: "/student/courses", keys: ["courses", "course", "enroll"] },
    { label: "My Notes", to: "/student/notes", keys: ["notes", "note"] },
    { label: "My Progress", to: "/student/progress", keys: ["progress", "results", "result", "marks", "mistakes"] },
    { label: "Class Chat", to: "/student/chat", keys: ["chat", "ask", "teacher", "question", "help"] },
    { label: "Code Lab", to: "/student/lab", keys: ["code", "lab", "html", "javascript"] },
  ],
  instructor: [
    { label: "Dashboard", to: "/teacher", keys: ["dashboard", "home"] },
    { label: "My Courses", to: "/teacher/courses", keys: ["courses", "course", "lessons", "quiz"] },
    { label: "Results", to: "/teacher/results", keys: ["results", "result", "marks", "gradebook"] },
    { label: "Grading", to: "/teacher/grading", keys: ["grading", "assignments", "assignment", "submissions", "picture", "diagram"] },
    { label: "Class Chat", to: "/teacher/chat", keys: ["chat", "questions", "ask", "review"] },
    { label: "Weak Topics", to: "/teacher/interventions", keys: ["weak", "topics", "notes", "retest"] },
  ],
  orgadmin: [
    { label: "Dashboard", to: "/admin", keys: ["dashboard", "home"] },
    { label: "Results", to: "/admin/results", keys: ["results", "result", "marks"] },
    { label: "Student Lookup", to: "/admin/students", keys: ["lookup", "report", "student report"] },
    { label: "Users", to: "/admin/users", keys: ["users", "user", "teachers", "parents", "reset", "password"] },
  ],
  parent: [{ label: "Dashboard", to: "/parent", keys: ["dashboard", "home"] }],
};
const ACCOUNT = { label: "My Account", to: "/account", keys: ["account", "settings", "password", "profile"] };

// Koi match na ho to yahan dhoondo
const SEARCH = {
  student: { to: "/student/courses", where: "Courses", ph: "Search courses, topics or pages..." },
  instructor: { to: "/teacher/courses", where: "My Courses", ph: "Search courses or pages..." },
  orgadmin: { to: "/admin/users", where: "Users", ph: "Search people, courses or pages..." },
};

// Course par click: har role ka apna page
const courseLink = (role, id) =>
  ({
    student: `/student/courses/${id}`,
    instructor: `/teacher/courses/${id}`,
    orgadmin: `/admin/results?course=${id}`,
  }[role]);
const courseSub = { student: "Open course", instructor: "Open course builder", orgadmin: "Course results" };

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState({ unread: 0, notifications: [] });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [courses, setCourses] = useState([]);
  const [people, setPeople] = useState([]);
  const role = user?.role;
  const search = SEARCH[role];
  const term = q.trim().toLowerCase();

  useEffect(() => {
    const load = () => api.get("/notifications/me").then((r) => setNotes(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Courses ek baar load karo (search ke liye)
  useEffect(() => {
    if (!role || role === "parent") return;
    const url = role === "instructor" ? "/courses?mine=true" : "/courses";
    api.get(url).then((r) => setCourses(r.data.courses || [])).catch(() => {});
  }, [role]);

  // Admin: naam likhte hi log dhoondo (thoda ruk ke, taake har letter par request na jaye)
  useEffect(() => {
    if (role !== "orgadmin" || term.length < 2) {
      setPeople([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get(`/users?q=${encodeURIComponent(term)}`)
        .then((r) => {
          const list = Array.isArray(r.data) ? r.data : r.data.users || [];
          setPeople(list.slice(0, 4));
        })
        .catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [term, role]);

  const markAll = async () => {
    await api.patch("/notifications/read-all");
    setNotes((n) => ({ unread: 0, notifications: n.notifications.map((x) => ({ ...x, isRead: true })) }));
  };

  // Suggestions
  const pages = [...(PAGES[role] || []), ACCOUNT];
  const pageHits =
    term.length >= 2
      ? pages.filter((p) => p.label.toLowerCase().includes(term) || p.keys.some((k) => k.startsWith(term) || term.startsWith(k)))
      : [];
  const courseHits =
    term.length >= 2
      ? courses.filter((c) => [c.title, ...(c.topics || [])].join(" ").toLowerCase().includes(term)).slice(0, 4)
      : [];

  const items = [
    ...pageHits.map((p) => ({ kind: "page", key: p.to, label: `Go to ${p.label}`, to: p.to })),
    ...courseHits.map((c) => ({ kind: "course", key: c._id, label: c.title, sub: courseSub[role], to: courseLink(role, c._id) })),
    ...people.map((u) => ({
      kind: "person",
      key: u._id,
      label: u.name,
      sub: ROLE_LABEL[u.role] || u.role,
      to: u.role === "student" ? `/admin/students?id=${u._id}` : `/admin/users?q=${encodeURIComponent(u.name)}`,
    })),
    ...(search && term
      ? [{ kind: "search", key: "search", label: `Search "${q.trim()}" in ${search.where}`, to: `${search.to}?q=${encodeURIComponent(q.trim())}` }]
      : []),
  ];

  const ICON = { page: ArrowRight, course: BookOpen, person: UserRound, search: Search };
  const COLOR = { page: "text-violet-300", course: "text-amber-300", person: "text-emerald-300", search: "text-cyan-300" };

  const go = (item) => {
    navigate(item.to);
    setQ("");
    setFocus(false);
  };

  const onSearch = (e) => {
    e.preventDefault();
    if (items[0]) go(items[0]);
  };

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[0.08] bg-[#0b0b1a]/80 backdrop-blur px-4 md:px-6 py-3">
            <ChildModeBar />
      <button onClick={onMenu} className="md:hidden rounded-lg p-2 text-gray-300 hover:bg-white/10">
        <Menu size={20} />
      </button>

      <div className="flex-1">
        {search && (
          <form onSubmit={onSearch} className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setTimeout(() => setFocus(false), 150)}
              placeholder={search.ph}
              className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-10 pr-16 py-2 text-sm outline-none focus:border-violet-500"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 text-[10px] text-gray-500">
              Enter
            </kbd>

            {focus && items.length > 0 && (
              <ul className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-[#14142b] py-1 shadow-2xl page-enter">
                {items.map((it, i) => {
                  const Icon = ICON[it.kind];
                  return (
                    <li key={`${it.kind}-${it.key}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(it)}
                        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                          i === 0 ? "bg-violet-500/10 text-white" : "text-gray-300"
                        }`}
                      >
                        <Icon size={15} className={`shrink-0 ${COLOR[it.kind]}`} />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.sub && <span className="shrink-0 text-[11px] text-gray-500">{it.sub}</span>}
                        {i === 0 && <span className="shrink-0 text-[10px] text-gray-500">Enter</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </form>
        )}
      </div>

      <div className="relative">
        <button onClick={() => setOpen(!open)} className="relative rounded-full p-2 text-gray-300 hover:bg-white/10">
          <Bell size={20} />
          {notes.unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-rose-500 text-[11px] font-bold text-white flex items-center justify-center px-1">
              {notes.unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            {/* 📱 Phone par screen ke beech (kate nahi), computer par bell ke neeche */}
            <div className="fixed left-3 right-3 top-16 z-20 rounded-2xl border border-white/10 bg-[#14142b] shadow-2xl overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="font-semibold text-sm">Notifications</span>
                {notes.unread > 0 && (
                  <button onClick={markAll} className="text-xs text-violet-300 hover:underline">Mark all as read</button>
                )}
              </div>
              <ul className="max-h-[70vh] overflow-y-auto sm:max-h-96">
                {notes.notifications.length === 0 && <li className="p-4 text-sm text-gray-500">You're all caught up ✨</li>}
                {notes.notifications.map((n) => (
                  <li key={n._id} className={`px-4 py-3 border-b border-white/5 ${n.isRead ? "" : "bg-violet-500/10"}`}>
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{n.message}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{ago(n.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.08]">
        <Link to="/account" title="My account" className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-white/5 transition">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-[11px] text-gray-400">{ROLE[user?.role]}</div>
          </div>
        </Link>
        <Link to="/account" title="Settings" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white">
          <Settings size={18} />
        </Link>
        <button onClick={logout} title="Log out" className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}