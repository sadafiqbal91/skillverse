import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Code2, Terminal } from "lucide-react";

// 💻 Code likho → wahin result (HTML / CSS / JavaScript)
// Code ek band dabbe (sandbox iframe) mein chalta hai, app ko chhoo nahi sakta 🔐
const CONSOLE_HOOK = `<script>
(function(){
  const send = (m) => parent.postMessage({ __lab: true, msg: m }, "*");
  const fmt = (a) => a.map((x) => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ");
  console.log = (...a) => send(fmt(a));
  console.error = (...a) => send("❌ " + fmt(a));
  window.onerror = (m) => send("❌ " + m);
})();
<\/script>`;

export const labTypeOf = (code = "") =>
  /<\w+[\s>]/.test(code) ? "html" : /console\.log|const |let |function|=>/.test(code) ? "js" : null;

const build = (code, type) =>
  type === "js"
    ? `${CONSOLE_HOOK}<body style="font-family:sans-serif;color:#ddd;background:#0b0b1a"><p style="opacity:.6">Output is in the console below 👇</p><script>${code}<\/script></body>`
    : `${CONSOLE_HOOK}<style>body{font-family:sans-serif;padding:12px}</style>${code}`;

export default function CodeLab({ initialCode = "", title = "Try it yourself", height = 280 }) {
  const type = labTypeOf(initialCode) || "html";
  const [code, setCode] = useState(initialCode);
  const [doc, setDoc] = useState(() => build(initialCode, type));
  const [logs, setLogs] = useState([]);
  const frame = useRef(null);

  // Console ke messages pakdo (sirf apne iframe se)
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.__lab && e.source === frame.current?.contentWindow) setLogs((l) => [...l.slice(-30), e.data.msg]);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Likhte likhte khud chale (thoda ruk kar)
  useEffect(() => {
    const t = setTimeout(() => {
      setLogs([]);
      setDoc(build(code, type));
    }, 600);
    return () => clearTimeout(t);
  }, [code, type]);

  const run = () => {
    setLogs([]);
    setDoc(build(code, type) + `<!-- ${Date.now()} -->`);
  };

  // Tab dabane par 2 space (focus bahar na jaye)
  const onKey = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en } = e.target;
    const next = code.slice(0, s) + "  " + code.slice(en);
    setCode(next);
    requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-black/40">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <Code2 size={16} /> 💻 {title}
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-gray-400">{type === "js" ? "JavaScript" : "HTML + CSS"}</span>
        </p>
        <div className="flex gap-1.5">
          <button onClick={() => { setCode(initialCode); setLogs([]); }} title="Reset"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={run} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500">
            <Play size={13} /> Run
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKey} spellCheck={false}
          style={{ height }}
          className="w-full resize-none border-b border-white/10 bg-[#0b0b1a] p-4 font-mono text-sm leading-relaxed text-emerald-100 outline-none md:border-b-0 md:border-r" />
        <iframe ref={frame} title="Result" sandbox="allow-scripts" srcDoc={doc} style={{ height }} className="w-full bg-white" />
      </div>

      {(type === "js" || logs.length > 0) && (
        <div className="max-h-32 overflow-y-auto border-t border-white/10 bg-black/60 px-4 py-2 font-mono text-xs">
          <p className="mb-1 flex items-center gap-1.5 text-gray-500"><Terminal size={12} /> Console</p>
          {!logs.length && <p className="text-gray-600">No output yet</p>}
          {logs.map((l, i) => <p key={i} className={l.startsWith("❌") ? "text-rose-300" : "text-gray-200"}>{l}</p>)}
        </div>
      )}
    </div>
  );
}