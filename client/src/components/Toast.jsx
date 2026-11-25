import { useEffect, useState } from "react";
import { X } from "lucide-react";

// 🍞 Toast: neeche kone mein chhota dabba, 4 second baad khud chala jata hai
const TONES = {
  lock: "border-amber-500/40 bg-[#2a1f0b] text-amber-100",
  info: "border-violet-500/40 bg-[#1e1638] text-violet-100",
  ok: "border-emerald-500/40 bg-[#0d2a20] text-emerald-100",
};

export default function Toast() {
  const [list, setList] = useState([]);

  useEffect(() => {
    const on = (e) => {
      const id = Date.now() + Math.random();
      setList((l) => [...l.filter((t) => t.text !== e.detail.text), { id, ...e.detail }].slice(-3));
      setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4000);
    };
    window.addEventListener("sv-toast", on);
    return () => window.removeEventListener("sv-toast", on);
  }, []);

  if (!list.length) return null;
  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 2000 }} className="flex max-w-[calc(100vw-32px)] flex-col gap-2 sm:max-w-sm">
      {list.map((t) => (
        <div key={t.id} role="status"
          className={"page-enter flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/50 " + (TONES[t.tone] || TONES.info)}>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => setList((l) => l.filter((x) => x.id !== t.id))} className="opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}