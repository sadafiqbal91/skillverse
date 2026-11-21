import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { speak, stopSpeak, canSpeak } from "../utils/speak";

const STEPS = [
  {
    icon: "🟢🟡🔴",
    title: { en: "The big colour", ur: "Bara rang" },
    en: "The big colour shows how your child is doing. Green means all good. Yellow means needs attention. Red means needs help now.",
    ur: "Bara rang batata hai ke bachcha kaisa ja raha hai. Hara matlab sab theek. Peela matlab tawajjo chahiye. Laal matlab abhi madad chahiye.",
  },
  {
    icon: "🔊",
    title: { en: "Listen", ur: "Suniye" },
    en: "Press Listen to hear the update instead of reading it.",
    ur: "Parhne ki bajaye Suniye ka button dabayein. App khud bol kar batayegi.",
  },
  {
    icon: "📅",
    title: { en: "Upcoming tests", ur: "Aane wale tests" },
    en: "See which test is coming and how many days are left. Help your child practise before it.",
    ur: "Dekhein kaunsa test aa raha hai aur kitne din baqi hain. Us se pehle bachche ko practice karwayein.",
  },
  {
    icon: "🤝",
    title: { en: "Teacher is helping", ur: "Teacher madad kar rahi hai" },
    en: "If your child is weak in a topic, the teacher sends notes and gives up to 3 re-tests. You can see every round here.",
    ur: "Agar bachcha kisi topic mein kamzor ho, to teacher notes bhejti hai aur 3 baar tak re-test deti hai. Har round yahan nazar aayega.",
  },
  {
    icon: "🧒",
    title: { en: "Child mode", ur: "Bachche ka mode" },
    en: "Young children do not need their own password. Press Open lessons, and your child can study on your phone.",
    ur: "Chhote bachchon ko apna password nahi chahiye. Lessons kholiye ka button dabayein, bachcha aapke phone par parh sakta hai.",
  },
  {
    icon: "🔔",
    title: { en: "The bell", ur: "Ghanti" },
    en: "The bell shows new results, notes and teacher messages. It is private, only about your child, not a WhatsApp group.",
    ur: "Ghanti mein naye results, notes aur teacher ke messages aate hain. Ye sirf aapke bachche ke baare mein hai, WhatsApp group ki tarah sab ke liye nahi.",
  },
];

export default function ParentGuide({ lang, setLang, onClose }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const close = () => {
    stopSpeak();
    onClose();
  };
  const move = (d) => {
    stopSpeak();
    setI((x) => x + d);
  };

  return createPortal(
    <div
      className="bg-black/70 backdrop-blur-sm p-4"
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12122a] p-6 text-white shadow-2xl page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex rounded-full bg-black/30 p-1 text-xs">
            {[["en", "English"], ["ur", "Roman Urdu"]].map(([k, l]) => (
              <button key={k} onClick={() => setLang(k)}
                className={`rounded-full px-3 py-1 transition ${lang === k ? "bg-violet-600 text-white" : "text-gray-400"}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={close} className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
        </div>

        <div className="mt-6 text-center">
          <div className="text-5xl">{step.icon}</div>
          <h2 className="mt-3 text-xl font-bold">{step.title[lang]}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-300">{step[lang]}</p>
          {canSpeak() && (
            <button onClick={() => speak(step[lang], lang)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/25">
              <Volume2 size={16} /> {lang === "ur" ? "Suniye" : "Listen"}
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-violet-500" : "w-1.5 bg-white/20"}`} />
          ))}
        </div>

        <div className="mt-5 flex justify-between">
          <button disabled={i === 0} onClick={() => move(-1)}
            className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30">
            <ChevronLeft size={16} /> {lang === "ur" ? "Peeche" : "Back"}
          </button>
          <button onClick={() => (last ? close() : move(1))}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 text-sm font-semibold hover:opacity-90">
            {last ? (lang === "ur" ? "Samajh gaya ✓" : "Got it ✓") : lang === "ur" ? "Aage" : "Next"} {!last && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}