import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, BarChart3, AlertTriangle, Search, Users, GraduationCap, ClipboardCheck, Code2, MessageCircle, Network,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const TREE = { school: "School Tree", college: "Sections", university: "Sections", computer_institute: "Batches", online_academy: "Batches" };

const menusFor = (labels, type) => ({
  student: [
    { to: "/student", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/student/courses", icon: BookOpen, label: "My " + labels.course + "s" },
    { to: "/student/chat", icon: MessageCircle, label: "Class Chat" },
    { to: "/student/notes", icon: FileText, label: "My Notes" },
    { to: "/student/progress", icon: BarChart3, label: "My Progress" },
    { to: "/student/lab", icon: Code2, label: "Code Lab" },
  ],
  instructor: [
    { to: "/teacher", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/teacher/courses", icon: BookOpen, label: "My " + labels.course + "s" },
    { to: "/teacher/chat", icon: MessageCircle, label: "Class Chat" },
    { to: "/teacher/results", icon: BarChart3, label: "Results" },
    { to: "/teacher/grading", icon: ClipboardCheck, label: "Grading" },
    { to: "/teacher/interventions", icon: AlertTriangle, label: "Weak Topics" },
  ],
  orgadmin: [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/tree", icon: Network, label: TREE[type] || "Classes" },
    { to: "/admin/results", icon: BarChart3, label: "Results" },
    { to: "/admin/students", icon: Search, label: "Student Lookup" },
    { to: "/admin/users", icon: Users, label: "Users" },
  ],
  parent: [{ to: "/parent", icon: LayoutDashboard, label: "Dashboard", end: true }],
});

const TYPE = {
  school: "School", college: "College", university: "University",
  computer_institute: "Computer Institute", online_academy: "Online Academy",
};

export default function Sidebar({ open, onClose }) {
  const { user, organization } = useAuth();
  const labels = organization?.settings?.labels || { course: "Course" };
  const items = menusFor(labels, organization?.type)[user?.role] || [];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />}
      <aside
        className={"fixed md:sticky md:top-0 md:h-screen z-40 inset-y-0 left-0 w-64 shrink-0 border-r border-white/[0.08] bg-[#0e0e22] p-4 flex flex-col transition-transform " +
          (open ? "translate-x-0" : "-translate-x-full md:translate-x-0")}
      >
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold tracking-tight">
              SkillVerse <span className="text-violet-400">AI</span>
            </div>
            <div className="text-[11px] text-gray-500">Learn • Practice • Grow</div>
          </div>
        </div>

        <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Menu</div>
        <nav className="space-y-1 flex-1">
          {items.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                (isActive
                  ? "bg-gradient-to-r from-violet-600 to-violet-500/60 text-white shadow-lg shadow-violet-900/40"
                  : "text-gray-400 hover:bg-white/5 hover:text-white")
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs">
          <div className="text-gray-500">Institute</div>
          <div className="font-semibold text-white mt-0.5">{organization?.name}</div>
          <span className="mt-2 inline-block rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-300">
            {TYPE[organization?.type] || organization?.type}
          </span>
        </div>
      </aside>
    </>
  );
}