import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12),transparent_50%)]">
          {/* key badalne se har naye page par animation dobara chalti hai */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}