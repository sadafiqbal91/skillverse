import { useState } from "react";
import { Code2 } from "lucide-react";
import CodeLab from "../../components/CodeLab";

const STARTERS = {
  html: { label: "HTML + CSS", code: "<h1 style=\"color: purple;\">My Page</h1>\n<p>Write anything here and see it on the right 👉</p>\n<ul>\n  <li>Cricket</li>\n  <li>Drawing</li>\n</ul>" },
  js: { label: "JavaScript", code: "// Click Run and look at the console 👇\nconst name = \"Ali\";\nconsole.log(\"Hello \" + name);\n\nfor (let i = 1; i <= 5; i++) {\n  console.log(\"2 x \" + i + \" = \" + 2 * i);\n}" },
};

export default function CodeLabPage() {
  const [kind, setKind] = useState("html");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight"><Code2 className="text-emerald-400" /> Code Lab</h1>
        <p className="mt-1 text-gray-400">Write code and see the result right away. Nothing to install. Your code runs safely in a sandbox.</p>
      </div>
      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {Object.entries(STARTERS).map(([k, s]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${kind === k ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <CodeLab key={kind} initialCode={STARTERS[kind].code} title="Playground" height={420} />
      <p className="text-xs text-gray-500">🐍 Python lab is coming in V3.</p>
    </div>
  );
}