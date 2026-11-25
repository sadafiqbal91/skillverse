import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock, HeartHandshake, ClipboardList, FileText, BookOpen, Trophy,
  Volume2, Square, Compass, Baby, Target, ChevronDown, ExternalLink, Eye, Award,
} from "lucide-react";
import api, { errMsg } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Card, Empty, Loading, ErrorBox } from "../../components/ui";
import ParentGuide from "../../components/ParentGuide";
import AnswersDrawer from "../../components/AnswersDrawer";
import DiaryCard from "../../components/DiaryCard";
import { TermMarks } from "../student/ProgressPage";
import { speak, stopSpeak, canSpeak } from "../../utils/speak";

const T = {
  en: {
    hello: "Hello", sub: "Here is how your child is doing.", upcoming: "Upcoming tests", help: "Teacher is helping with",
    assign: "Assignments", notes: "Notes from teacher", subjects: "Subjects", recent: "Recent quiz results", topics: "Topic mastery",
    listen: "Listen", stop: "Stop", guide: "Guide", open: (n) => `Open ${n}'s lessons`, submit: (n) => `Submit with ${n}`,
    noTests: "No tests coming up.", noHelp: "No extra help needed right now 🎉", noAssign: "No assignments yet.",
    noNotes: "No notes yet.", noQuiz: "No quizzes taken yet.", stats: ["Quiz average", "Quizzes taken", "Subjects", "Weak topics"],
    status: { green: "On track", yellow: "Needs attention", red: "Needs help now" }, nextTest: "Next test",
    tapResult: "Tap to see answers", tapOpen: "Tap to open", retest: "Re-test", instructions: "Instructions", feedback: "Teacher's feedback", file: "Open file",
    tapSubject: "Tap a subject to see its tests, homework and results", sTests: "Tests", sWork: "Homework", sResults: "Quiz results", sNotes: "Notes",
    nothing: "Nothing here yet", toDo: (n) => `${n} to do`, avg: "avg", progress: "Lessons done",
    term: "Term marks (out of 25)", termHint: "🧠 Quizzes 15 + 📝 Homework 10. Re-tests are practice and never reduce marks. The final exam (75) is separate.",
  },
  ur: {
    hello: "Assalam o Alaikum", sub: "Aapka bachcha kaisa ja raha hai, yahan dekhein.", upcoming: "Aane wale tests",
    help: "Teacher in topics mein madad kar rahi hai", assign: "Homework / Assignments", notes: "Teacher ke notes",
    subjects: "Subjects", recent: "Haal ke quiz results", topics: "Topics ki samajh",
    listen: "Suniye", stop: "Band karein", guide: "Rehnumai", open: (n) => `${n} ke lessons kholiye`, submit: (n) => `${n} ke saath jama karein`,
    noTests: "Abhi koi test nahi.", noHelp: "Abhi kisi madad ki zaroorat nahi 🎉", noAssign: "Abhi koi assignment nahi.",
    noNotes: "Abhi koi notes nahi.", noQuiz: "Abhi koi quiz nahi diya.", stats: ["Quiz average", "Quiz diye", "Subjects", "Kamzor topics"],
    status: { green: "Sab theek hai", yellow: "Tawajjo chahiye", red: "Abhi madad chahiye" }, nextTest: "Agla test",
    tapResult: "Jawab dekhne ke liye dabayein", tapOpen: "Kholne ke liye dabayein", retest: "Re-test", instructions: "Hidayat", feedback: "Teacher ki raaye", file: "File kholiye",
    tapSubject: "Subject par dabayein: us ke tests, homework aur results", sTests: "Tests", sWork: "Homework", sResults: "Quiz ke results", sNotes: "Notes",
    nothing: "Abhi kuch nahi", toDo: (n) => `${n} baqi`, avg: "avg", progress: "Lessons mukammal",
    term: "Term ke marks (25 mein se)", termHint: "🧠 Quiz 15 + 📝 Homework 10. Re-test sirf practice hai, is se marks kam nahi hote. Final exam (75) alag hai.",
  },
};

const STYLE = {
  green: { dot: "🟢", ring: "border-emerald-500/40 from-emerald-500/20", text: "text-emerald-300" },
  yellow: { dot: "🟡", ring: "border-amber-500/40 from-amber-500/20", text: "text-amber-300" },
  red: { dot: "🔴", ring: "border-rose-500/40 from-rose-500/20", text: "text-rose-300" },
};
const LEVEL = {
  strong: "bg-emerald-500/15 text-emerald-300", average: "bg-amber-500/15 text-amber-300", weak: "bg-rose-500/15 text-rose-300",
  recovered: "bg-cyan-500/15 text-cyan-300", not_started: "bg-white/5 text-gray-500",
};
const ASSIGN = {
  pending: ["Not submitted", "bg-white/5 text-gray-300"],
  late: ["Late", "bg-rose-500/15 text-rose-300"],
  submitted: ["Waiting for check", "bg-cyan-500/15 text-cyan-300"],
  graded: ["Checked", "bg-emerald-500/15 text-emerald-300"],
};
const tone = (p) => (p >= 70 ? "text-emerald-300" : p >= 50 ? "text-amber-300" : "text-rose-300");
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const daysLeft = (d) => {
  const n = Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return n <= 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
};

// 📚 Har subject ka card: andar us ke tests, homework, quiz results aur notes
function SubjectCard({ c, items, t, open, onToggle, onAnswers, onSubmit, first, term }) {
  const { tests, work, results, notes } = items;
  const toDo = work.filter((a) => a.state === "pending" || a.state === "late").length;
  const avg = results.length ? Math.round(results.reduce((x, a) => x + a.percent, 0) / results.length) : null;
  const next = tests[0];
  const p = c.progressPercent || 0;
  const head = (Icon, label, n) => (
    <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      <Icon size={12} /> {label} {n ? <span className="text-gray-600">({n})</span> : null}
    </p>
  );
  const none = <p className="text-xs text-gray-600">{t.nothing}</p>;

  return (
    <div className={`rounded-2xl border transition ${open ? "border-violet-500/50 bg-violet-500/[0.06] md:col-span-2" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{c.title}</p>
          <ChevronDown size={16} className={`mt-0.5 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="bar-grow h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${p}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">{t.progress}: {p}%</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
          {next && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-300">📅 {daysLeft(next.testDate)}</span>}
          {toDo > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">📝 {t.toDo(toDo)}</span>}
          {avg != null && <span className={`rounded-full bg-white/5 px-2 py-0.5 ${tone(avg)}`}>🏆 {avg}% {t.avg}</span>}
          {notes.length > 0 && <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-300">📄 {notes.length}</span>}
          {term?.total != null && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-200">📊 {term.total}/{term.max}</span>}
        </div>
      </button>

      {open && (
        <div className="grid gap-x-6 border-t border-white/10 px-4 pb-4 md:grid-cols-2 page-enter">
          <div>
            {head(CalendarClock, t.sTests, tests.length)}
            {!tests.length ? none : tests.map((q) => (
              <div key={q._id} className="mb-1.5 flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                <span>{q.title} <span className="text-xs text-gray-500">· {fmt(q.testDate)}</span></span>
                <span className="text-xs font-semibold text-violet-300">{daysLeft(q.testDate)}</span>
              </div>
            ))}

            {head(Trophy, t.sResults, results.length)}
            {!results.length ? none : results.map((a) => (
              <button key={a._id} onClick={() => onAnswers(a._id)}
                className="mb-1.5 flex w-full items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-left text-sm hover:bg-white/[0.06]">
                <span>{a.quiz}{a.kind === "retest" && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-300">{t.retest}</span>}</span>
                <span className="flex items-center gap-2"><b className={tone(a.percent)}>{a.percent}%</b><Eye size={14} className="text-gray-500" /></span>
              </button>
            ))}
          </div>
          <div>
            {head(ClipboardList, t.sWork, work.length)}
            {!work.length ? none : work.map((a) => {
              const [label, cls] = ASSIGN[a.state];
              return (
                <div key={a._id} className="mb-1.5 rounded-lg bg-black/20 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{a.title}{a.due && <span className="text-xs text-gray-500"> · {fmt(a.due)}</span>}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                      {a.state === "graded" && a.marks != null ? `${label}: ${a.marks}${a.max ? `/${a.max}` : ""}` : label}
                    </span>
                  </div>
                  {a.feedback && <p className="mt-1 text-xs italic text-emerald-200">💬 "{a.feedback}"</p>}
                  {(a.state === "pending" || a.state === "late") && (
                    <button onClick={() => onSubmit(c.courseId)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                      <Baby size={13} /> {t.submit(first)}
                    </button>
                  )}
                </div>
              );
            })}

            {head(FileText, t.sNotes, notes.length)}
            {!notes.length ? none : notes.map((n) => (
              <p key={n._id} className="mb-1.5 rounded-lg bg-black/20 px-3 py-2 text-sm">
                {n.title} <span className="text-xs text-gray-500">· {fmt(n.createdAt)}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const { user, enterChildMode } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState(null);
  const [cid, setCid] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [lang, setLang] = useState(() => localStorage.getItem("sv_lang") || "en");
  const [guide, setGuide] = useState(false);
  const [talking, setTalking] = useState(false);
  const [openAssign, setOpenAssign] = useState(null);
  const [openNote, setOpenNote] = useState(null);
  const [answersUrl, setAnswersUrl] = useState(null);
  const [openSubject, setOpenSubject] = useState(null);
  const t = T[lang];

  useEffect(() => localStorage.setItem("sv_lang", lang), [lang]);

  // Pehli baar aaye to Guide khud khule
  useEffect(() => {
    if (!localStorage.getItem("sv_parent_guide")) {
      setGuide(true);
      localStorage.setItem("sv_parent_guide", "1");
    }
    return () => stopSpeak();
  }, []);

  useEffect(() => {
    api.get("/parents/me/children")
      .then((r) => {
        setChildren(r.data.children);
        if (r.data.children[0]) setCid(r.data.children[0]._id);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (!cid) return;
    setData(null);
    stopSpeak();
    setTalking(false);
    api.get(`/parents/children/${cid}/overview`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [cid]);

  const listen = () => {
    if (talking) {
      stopSpeak();
      setTalking(false);
      return;
    }
    const first = data.child.name.split(" ")[0];
    const next = data.upcoming[0];
    const parts = [
      `${first}: ${t.status[data.status]}.`,
      lang === "ur" ? data.reasonUr : data.reason,
      next ? `${t.nextTest}: ${next.title}, ${daysLeft(next.testDate)}.` : "",
    ];
    setTalking(speak(parts.join(" "), lang, () => setTalking(false)));
  };

  // 🧒 Child mode: dashboard par, ya seedha kisi course mein (assignment jama karne ke liye)
  const openChild = async (path = "/student") => {
    try {
      const r = await api.post(`/parents/children/${cid}/child-mode`);
      stopSpeak();
      enterChildMode(r.data);
      navigate(path, { replace: true });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (error) return <ErrorBox text={error} />;
  if (!children) return <Loading />;
  if (!children.length) return <Card><Empty text="No child is linked to your account yet. Please ask your school." /></Card>;

  const st = data && STYLE[data.status];
  const first = data?.child.name.split(" ")[0];
  const hint = (txt) => <span className="text-[11px] text-gray-500">{txt}</span>;

  // 📚 Sab cheezein subject ke hisaab se (courseId ya course ke naam se)
  const bySubject = {};
  if (data) {
    const idOf = {};
    data.courses.forEach((c) => {
      idOf[c.title] = String(c.courseId);
      bySubject[String(c.courseId)] = { tests: [], work: [], results: [], notes: [] };
    });
    const put = (x, key, list) => {
      const id = x.courseId ? String(x.courseId) : idOf[x.course];
      if (id && bySubject[id]) bySubject[id][list].push(x);
    };
    data.upcoming.forEach((q) => put(q, "course", "tests"));
    data.assignments.forEach((a) => put(a, "course", "work"));
    data.recentAttempts.forEach((a) => put(a, "course", "results"));
    data.notes.forEach((n) => put(n, "course", "notes"));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.hello}, {user?.name} 👋</h1>
          <p className="mt-1 text-gray-400">{t.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs">
            {[["en", "English"], ["ur", "Roman Urdu"]].map(([k, l]) => (
              <button key={k} onClick={() => setLang(k)}
                className={`rounded-full px-3 py-1 transition ${lang === k ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setGuide(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white">
            <Compass size={14} /> {t.guide}
          </button>
        </div>
      </div>

      {/* Child switcher */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c) => (
            <button key={c._id} onClick={() => setCid(c._id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${c._id === cid ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!data ? <Loading /> : (
        <>
          {/* 🟢🟡🔴 Status */}
          <div className={`page-enter rounded-3xl border bg-gradient-to-br to-transparent p-6 md:p-8 ${st.ring}`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="text-5xl leading-none md:text-6xl">{st.dot}</div>
                <div>
                  <p className="text-sm text-gray-400">{data.child.name}</p>
                  <h2 className={`text-2xl md:text-3xl font-bold ${st.text}`}>{t.status[data.status]}</h2>
                  <p className="mt-2 max-w-xl text-base text-gray-200">{lang === "ur" ? data.reasonUr : data.reason}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col">
                {canSpeak() && (
                  <button onClick={listen}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500/15 px-5 py-3 text-base font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
                    {talking ? <Square size={18} /> : <Volume2 size={18} />} {talking ? t.stop : t.listen}
                  </button>
                )}
                <button onClick={() => openChild()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 text-base font-semibold transition hover:opacity-90">
                  <Baby size={18} /> {t.open(first)}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 stagger">
            {[
              [data.summary.quizzesTaken ? `${data.summary.averageQuizPercent}%` : "—", t.stats[0]],
              [data.summary.quizzesTaken, t.stats[1]],
              [data.summary.coursesEnrolled, t.stats[2]],
              [data.weakTopics.length, t.stats[3]],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-gray-400">{l}</div>
              </div>
            ))}
          </div>

          {/* 📒 Bache ki diary */}
          <DiaryCard url={`/diary/child/${cid}`} parent lang={lang} />

          {/* 📚 Subject cards */}
          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg font-semibold"><BookOpen size={18} className="text-violet-400" /> {t.subjects}</h3>
              {hint(t.tapSubject)}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 stagger">
              {data.courses.map((c) => {
                const id = String(c.courseId);
                return (
                  <SubjectCard key={id} c={c} t={t} first={first} items={bySubject[id]}
                    term={(data.termScores || []).find((x) => String(x.courseId) === id)}
                    open={openSubject === id} onToggle={() => setOpenSubject(openSubject === id ? null : id)}
                    onAnswers={(aid) => setAnswersUrl(`/parents/children/${cid}/attempts/${aid}`)}
                    onSubmit={(courseId) => openChild(`/student/courses/${courseId}`)} />
                );
              })}
            </div>
          </div>

          {/* 📊 Term marks */}
          {data.termScores?.length > 0 && (
            <Card title={t.term} icon={Award}>
              <TermMarks rows={data.termScores} compact />
              <p className="mt-3 text-[11px] text-gray-500">{t.termHint}</p>
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {/* 📅 Upcoming tests */}
            <Card title={t.upcoming} icon={CalendarClock}>
              {!data.upcoming.length ? <Empty text={t.noTests} /> : (
                <ul className="space-y-2">
                  {data.upcoming.map((q) => (
                    <li key={q._id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                      <div>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-xs text-gray-500">{q.course} · {fmt(q.testDate)}</p>
                      </div>
                      <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">{daysLeft(q.testDate)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* 🤝 Teacher is helping */}
            <Card title={t.help} icon={HeartHandshake}>
              {!data.help.length ? <Empty text={t.noHelp} /> : (
                <ul className="space-y-2">
                  {data.help.map((h) => (
                    <li key={h.topic} className="rounded-xl bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{h.topic}</p>
                        {h.oneOnOne ? (
                          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">1-on-1</span>
                        ) : (
                          <span className="text-xs text-gray-400">{t.retest} {h.round} / {h.maxRounds}</span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {Array.from({ length: h.maxRounds }).map((_, k) => (
                          <span key={k} className={`h-1.5 flex-1 rounded-full ${k < h.round ? "bg-amber-400" : "bg-white/10"}`} />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{lang === "ur" ? h.noteUr : h.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* 📝 Assignments (click → details + Submit with child) */}
            <Card title={t.assign} icon={ClipboardList} action={data.assignments.length ? hint(t.tapOpen) : null}>
              {!data.assignments.length ? <Empty text={t.noAssign} /> : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {data.assignments.map((a) => {
                    const [label, cls] = ASSIGN[a.state];
                    const open = openAssign === a._id;
                    return (
                      <li key={a._id} className="rounded-xl bg-white/[0.03]">
                        <button onClick={() => setOpenAssign(open ? null : a._id)}
                          className="flex w-full items-start justify-between gap-2 rounded-xl px-4 py-3 text-left hover:bg-white/[0.03]">
                          <div>
                            <p className="font-medium">{a.title}</p>
                            <p className="text-xs text-gray-500">{a.course}{a.due ? ` · due ${fmt(a.due)}` : ""}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
                              {a.state === "graded" && a.marks != null ? `${label}: ${a.marks}${a.max ? `/${a.max}` : ""}` : label}
                            </span>
                            <ChevronDown size={15} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        {open && (
                          <div className="space-y-2 px-4 pb-3 text-sm page-enter">
                            {a.image && (
                              <a href={a.image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 bg-white">
                                <img src={a.image} alt={a.imageCaption || a.title} className="mx-auto max-h-56 w-auto object-contain" />
                              </a>
                            )}
                            {a.instructions && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-gray-500">{t.instructions}</p>
                                <p className="whitespace-pre-line text-gray-300">{a.instructions}</p>
                              </div>
                            )}
                            {a.feedback && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-gray-500">{t.feedback}</p>
                                <p className="italic text-emerald-200">💬 "{a.feedback}"</p>
                              </div>
                            )}
                            {!a.instructions && !a.feedback && !a.image && <p className="text-xs text-gray-500">No more details.</p>}

                            {/* 🧒 Bachche ke saath jama karo */}
                            {(a.state === "pending" || a.state === "late") && a.courseId && (
                              <button onClick={() => openChild(`/student/courses/${a.courseId}`)}
                                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold hover:opacity-90">
                                <Baby size={16} /> {t.submit(first)}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* 📄 Notes (click → poore notes) */}
            <Card title={t.notes} icon={FileText} action={data.notes.length ? hint(t.tapOpen) : null}>
              {!data.notes.length ? <Empty text={t.noNotes} /> : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {data.notes.map((n) => {
                    const open = openNote === n._id;
                    return (
                      <li key={n._id} className="rounded-xl bg-white/[0.03]">
                        <button onClick={() => setOpenNote(open ? null : n._id)} className="w-full rounded-xl px-4 py-3 text-left hover:bg-white/[0.03]">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{n.title}</p>
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              {fmt(n.createdAt)}
                              <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                            </span>
                          </div>
                          <p className="text-xs text-violet-300">{n.course}{n.topic ? ` · ${n.topic}` : ""}</p>
                          {!open && n.text && <p className="mt-1 line-clamp-1 text-xs text-gray-400">{n.text}</p>}
                        </button>
                        {open && (
                          <div className="px-4 pb-3 page-enter">
                            <p className="whitespace-pre-line text-sm text-gray-300">{n.text}</p>
                            {n.fileUrl && (
                              <a href={n.fileUrl} target="_blank" rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                                <ExternalLink size={13} /> {t.file}
                              </a>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* 🏆 Recent results (click → 👁️ View answers) */}
            <Card title={t.recent} icon={Trophy} action={data.recentAttempts.length ? hint(t.tapResult) : null}>
              {!data.recentAttempts.length ? <Empty text={t.noQuiz} /> : (
                <ul className="space-y-2">
                  {data.recentAttempts.map((a) => (
                    <li key={a._id}>
                      <button onClick={() => setAnswersUrl(`/parents/children/${cid}/attempts/${a._id}`)}
                        className="group flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-left transition hover:bg-white/[0.07]">
                        <div>
                          <p className="text-sm font-medium">
                            {a.quiz}
                            {a.kind === "retest" && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">{t.retest}</span>}
                          </p>
                          <p className="text-xs text-gray-500">{fmt(a.submittedAt)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${tone(a.percent)}`}>{a.percent}%</span>
                          <Eye size={16} className="text-gray-500 transition group-hover:text-white" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* 🎯 Topics */}
          <Card title={t.topics} icon={Target}>
            <div className="flex flex-wrap gap-2">
              {data.topics.map((tp) => (
                <span key={tp.topic} className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL[tp.level]}`}>
                  {tp.topic}{tp.percent != null ? ` · ${tp.percent}%` : ""}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-500">🟩 Strong · 🟨 Average · 🟥 Weak · 🟦 Recovered after re-test · ⬜ Not tested yet</p>
          </Card>
        </>
      )}

      {guide && <ParentGuide lang={lang} setLang={setLang} onClose={() => setGuide(false)} />}
      {answersUrl && <AnswersDrawer url={answersUrl} onClose={() => setAnswersUrl(null)} />}
    </div>
  );
}