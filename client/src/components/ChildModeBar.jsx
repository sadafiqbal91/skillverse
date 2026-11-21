import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Baby } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Child mode mein neeche ek patti: "Back to parent"
export default function ChildModeBar() {
  const { user, exitChildMode } = useAuth();
  const navigate = useNavigate();
  if (!user?.childMode) return null;

  const back = () => {
    exitChildMode();
    navigate("/parent", { replace: true });
  };

  return createPortal(
    <div
      style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", zIndex: 900 }}
      className="flex items-center gap-3 rounded-full border border-amber-400/30 bg-[#1a1530]/95 px-4 py-2 text-sm text-white shadow-2xl backdrop-blur page-enter"
    >
      <Baby size={16} className="text-amber-300" />
      <span>
        Child mode: <b>{user.name}</b>
      </span>
      <button
        onClick={back}
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/30"
      >
        <ArrowLeft size={13} /> Back to parent
      </button>
    </div>,
    document.body
  );
}