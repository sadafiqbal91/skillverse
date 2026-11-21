import { useEffect, useState } from "react";
import {
  Sprout, FileText, Users, Award, BarChart3, Bot, Building2, NotebookPen, Bell, TrafficCone, Landmark, PartyPopper,
} from "lucide-react";

export const FEATURES = [
  { icon: Sprout, title: "Smart Re-test", desc: "Weak topic detected? A short re-test is ready automatically.", grad: "from-emerald-500 to-teal-600" },
  { icon: FileText, title: "Teacher Notes", desc: "Teachers send notes once, every struggling student gets them.", grad: "from-violet-500 to-indigo-600" },
  { icon: Users, title: "Parent View", desc: "Parents see their child's progress from home.", grad: "from-pink-500 to-rose-600" },
  { icon: Award, title: "Certificates", desc: "Finish a course, download a beautiful certificate.", grad: "from-amber-400 to-orange-500" },
  { icon: BarChart3, title: "Topic Heatmap", desc: "See exactly which topic is weak, not just a total score.", grad: "from-cyan-500 to-blue-600" },
  { icon: Bot, title: "AI Tutor", desc: "Help from course material only, with the teacher in the loop.", grad: "from-fuchsia-500 to-purple-600" },
  { icon: Building2, title: "Principal Dashboard", desc: "Every teacher's impact and every student's progress in one place.", grad: "from-sky-500 to-cyan-600" },
  { icon: NotebookPen, title: "Mistake Notebook", desc: "Every wrong answer with the right one, ready for revision.", grad: "from-lime-500 to-green-600" },
  { icon: Bell, title: "Live Alerts", desc: "Students, teachers and parents get the right alert at the right time.", grad: "from-orange-500 to-red-500" },
  { icon: TrafficCone, title: "Traffic Light", desc: "Green, yellow, red. Even busy parents understand at a glance.", grad: "from-yellow-400 to-amber-600" },
  { icon: Landmark, title: "Any Institute", desc: "School, college, university or academy. One platform.", grad: "from-indigo-500 to-violet-700" },
  { icon: PartyPopper, title: "Celebrate Wins", desc: "Recover a weak topic and the confetti flies.", grad: "from-rose-400 to-pink-600" },
];

const N = FEATURES.length;

// 🧮 Har shakal ka formula: har card ko { y, rotateY, rotateX, z, scale } deta hai
const LAYOUTS = {
  ring: (i) => ({ y: 0, ry: (360 / N) * i, rx: 0, z: 400, s: 1 }),
  barrel: (i) => {
    const row = i % 2;
    return { y: row ? 115 : -115, ry: (360 / (N / 2)) * Math.floor(i / 2) + row * 30, rx: 0, z: 320, s: 0.9 };
  },
  helix: (i) => ({ y: (i - (N - 1) / 2) * 30, ry: i * 42, rx: 0, z: 330, s: 0.85 }),
  sphere: (i) => {
    const y = 1 - (i / (N - 1)) * 2;
    const lat = Math.asin(y) * (180 / Math.PI);
    return { y: 0, ry: i * 137.508, rx: lat, z: 300, s: 0.72 };
  },
};

const SHAPES = ["helix", "barrel", "ring", "sphere"];

export default function FeatureGallery() {
  const [shape, setShape] = useState("ring");
  const [active, setActive] = useState(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // 🖱️ Card khula ho to: page par KAHIN BHI click (card ke ilawa) ya Esc → cards phir ghoomein
  useEffect(() => {
    if (active === null) return;
    const onPointer = (e) => {
      if (e.target.closest("[data-gallery-card]")) return; // card par click: us ka content dikhao
      setActive(null);
    };
    const onKey = (e) => e.key === "Escape" && setActive(null);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  // ♿ Reduce motion → seedhi grid
  if (reduced) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className={`rounded-2xl bg-gradient-to-br ${f.grad} p-4`}>
            <f.icon size={26} className="text-white" />
            <div className="mt-3 font-semibold text-white">{f.title}</div>
            <div className="mt-1 text-xs text-white/80">{f.desc}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="relative mx-auto h-[420px] w-full overflow-hidden md:h-[540px]" style={{ perspective: "1300px" }}>
        <div className="absolute inset-0 origin-center scale-[0.62] md:scale-100">
          <div className={`gallery3d-stage absolute inset-0 ${active !== null ? "paused" : ""}`} style={{ transformStyle: "preserve-3d" }}>
            {FEATURES.map((f, i) => {
              const p = LAYOUTS[shape](i);
              return (
                <button
                  key={f.title}
                  data-gallery-card
                  onClick={() => setActive(i)} // ek click = ruko + content
                  className={`absolute left-1/2 top-1/2 -ml-[75px] -mt-[95px] h-[190px] w-[150px] cursor-pointer rounded-2xl bg-gradient-to-br ${f.grad} p-4 text-left shadow-2xl outline-none [backface-visibility:hidden] transition-[transform,box-shadow] duration-1000 ease-[cubic-bezier(.2,.8,.2,1)] ${
                    active === i ? "ring-4 ring-white/80" : "ring-1 ring-white/20"
                  }`}
                  style={{
                    transform: `translateY(${p.y}px) rotateY(${p.ry}deg) rotateX(${p.rx}deg) translateZ(${p.z}px) scale(${p.s})`,
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.35),transparent_55%)]" />
                  <f.icon size={30} className="relative text-white" />
                  <div className="relative pt-16 text-sm font-bold leading-tight text-white">{f.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 h-14 max-w-md text-center">
        {active !== null ? (
          <div className="page-enter">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">{FEATURES[active].title}:</span> {FEATURES[active].desc}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">Click anywhere to keep the cards spinning ↻</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Click any card to learn more</p>
        )}
      </div>

      <div className="mt-2 flex justify-center gap-2">
        {SHAPES.map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              shape === s ? "bg-white text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}