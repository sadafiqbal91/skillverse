import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, XCircle, Eye } from "lucide-react";
import api, { errMsg } from "../api/api";

const tone = (p) => (p >= 70 ? "text-emerald-300" : p >= 50 ? "text-amber-300" : "text-rose-300");
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// 👁️ Kisi bhi attempt ke jawab: bachche ka vs sahi
export default function AnswersDrawer({ url, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(url).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [url]);

  return createPortal(
    <div
      className="bg-black/60 backdrop-blur-sm"
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0e0e22] p-6 text-white shadow-2xl page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400"><Eye size={13} /> View answers</p>
            <h2 className="mt-1 text-xl font-bold">{data?.quiz || "Loading..."}</h2>
            {data && (
              <p className="mt-1 text-sm text-gray-400">
                {data.kind === "retest" && <span className="mr-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">Re-test</span>}
                <b className={tone(data.percent)}>{data.percent}%</b> · {data.correct} of {data.total} correct · {fmt(data.submittedAt)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button>
        </div>

        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        {!data && !error && <div className="h-60 animate-pulse rounded-xl bg-white/5" />}

        {data && (
          <ol className="space-y-3">
            {data.items.map((it) => (
              <li key={it.n} className={`rounded-2xl border p-4 ${it.isCorrect ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-rose-500/20 bg-rose-500/[0.04]"}`}>
                <div className="flex items-start gap-2">
                  {it.isCorrect ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.n}. {it.text}</p>
                    {it.topic && <p className="mt-0.5 text-[11px] text-violet-300">{it.topic}</p>}
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 pl-6">
                  {it.options.map((op, k) => {
                    const isRight = k === it.correct;
                    const isChosen = k === it.chosen;
                    return (
                      <li key={k}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                          isRight ? "bg-emerald-500/15 text-emerald-200"
                          : isChosen ? "bg-rose-500/15 text-rose-200"
                          : "text-gray-400"
                        }`}>
                        <span>{op}</span>
                        <span className="text-[11px] font-semibold">
                          {isRight && isChosen ? "✓ Your answer" : isRight ? "✓ Correct" : isChosen ? "✗ Chosen" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {it.chosen === null && <p className="mt-2 pl-6 text-xs text-amber-300">Left blank</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>,
    document.body
  );
}