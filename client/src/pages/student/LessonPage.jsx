import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Award, CheckCircle2, Clock, Lock, PlayCircle,
  Volume2, Square, KeyRound, Lightbulb, Code2, ListChecks, Copy, Check, FileText,
} from "lucide-react";
import api from "../../api/api";
import celebrate from "../../utils/celebrate";
import { speak, stopSpeak, canSpeak } from "../../utils/speak";
import CodeLab, { labTypeOf } from "../../components/CodeLab";

const msg = (e) => e.response?.data?.message || "Something went wrong";
const embedUrl = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
};
const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-6";
// 🟢 Urdu likhai hai? (daayein se baayein + Urdu awaaz)
const isUrdu = (t = "") => /[؀-ۿ]/.test(t);

function Section({ icon: Icon, color, title, action, children }) {
  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-white"><Icon className={`h-5 w-5 ${color}`} /> {title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function CheckItem({ n, q }) {
  const [show, setShow] = useState(false);
  return (
    <li className="rounded-xl bg-white/[0.03] p-4">
      <p dir="auto" className="text-sm font-medium text-white">{n}. {q.question}</p>
      {show ? (
        <p dir="auto" className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 page-enter">✓ {q.answer}</p>
      ) : (
        <button onClick={() => setShow(true)} className="mt-2 text-xs font-semibold text-violet-300 hover:text-violet-200">
          Think first, then show answer 👀
        </button>
      )}
    </li>
  );
}

export default function LessonPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [talking, setTalking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLesson(null); setLocked(false); setError(""); setJustDone(false); setFinished(false);
    stopSpeak(); setTalking(false);
    (async () => {
      try {
        const l = await api.get(`/lessons/${id}`);
        const c = await api.get(`/courses/${l.data.courseId}`);
        if (!alive) return;
        setLesson(l.data);
        setCourse(c.data);
      } catch (e) {
        if (!alive) return;
        if (e.response?.status === 403) setLocked(true);
        else setError(msg(e));
      }
    })();
    return () => { alive = false; stopSpeak(); };
  }, [id]);

  const complete = async () => {
    setSaving(true);
    try {
      const r = await api.post(`/lessons/${id}/complete`);
      setLesson((l) => ({ ...l, completed: true }));
      setJustDone(true);
      setCourse((c) => ({
        ...c,
        enrollment: {
          ...c.enrollment,
          progressPercent: r.data.progressPercent,
          status: r.data.status,
          completedLessons: [...(c.enrollment?.completedLessons || []), id],
        },
      }));
      if (r.data.courseCompleted) {
        setFinished(true);
        celebrate();
      }
    } catch (e) {
      setError(msg(e));
    } finally {
      setSaving(false);
    }
  };

  const listen = () => {
    if (talking) { stopSpeak(); setTalking(false); return; }
    const text = [lesson.title, lesson.content, ...(lesson.keyPoints || [])].join(". ");
    setTalking(speak(text, isUrdu(text) ? "ur" : "en", () => setTalking(false)));
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(lesson.exampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (locked) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15">
          <Lock className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-white">This lesson is locked</h2>
        <p className="mt-2 text-sm text-slate-400">Enroll in the course to open its lessons.</p>
        <button onClick={() => nav("/student/courses")} className="mt-6 rounded-xl bg-violet-600 px-5 py-2 font-semibold text-white hover:bg-violet-500">
          Browse courses
        </button>
      </div>
    );
  }
  if (error && !lesson) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;
  if (!lesson || !course) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" />;

  const all = course.modules.flatMap((m) => m.lessons);
  const idx = all.findIndex((l) => String(l._id) === String(id));
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const done = new Set((course.enrollment?.completedLessons || []).map(String));
  const progress = course.enrollment?.progressPercent || 0;
  const video = embedUrl(lesson.videoUrl);
  const courseDone = course.enrollment?.status === "completed";
  const keyPoints = lesson.keyPoints || [];
  const checks = lesson.checkYourself || [];
  const empty = !lesson.content && !keyPoints.length && !lesson.example && !lesson.exampleCode && !checks.length;
  const urdu = isUrdu(lesson.content || lesson.title);
  const big = urdu ? " text-lg leading-loose" : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-5">
        <Link to={`/student/courses/${course.course._id}`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {course.course.title}
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Lesson {idx + 1} of {all.length}</p>
          <h1 dir="auto" className="mt-1 text-3xl font-bold text-white">{lesson.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            {lesson.durationMinutes && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{lesson.durationMinutes} min</span>}
            {(lesson.topics || []).map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-xs">{t}</span>)}
          </div>
        </div>

        {video && (
          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe src={video} title={lesson.title} className="h-full w-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          </div>
        )}
        {!video && lesson.videoUrl && (
          <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:underline">
            <PlayCircle className="h-4 w-4" /> Open lesson video
          </a>
        )}

        {empty && <div className={`${card} text-slate-400`}>📚 Your teacher is still writing this lesson. Watch the video for now.</div>}

        {lesson.content && (
          <Section icon={FileText} color="text-violet-400" title="Explanation"
            action={canSpeak() && (
              <button onClick={listen} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25">
                {talking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {talking ? "Stop" : urdu ? "Listen (اردو)" : "Listen"}
              </button>
            )}>
            <div dir="auto" className={"whitespace-pre-line leading-relaxed text-slate-200" + big}>{lesson.content}</div>
          </Section>
        )}

        {keyPoints.length > 0 && (
          <Section icon={KeyRound} color="text-amber-400" title="Key points">
            <ul className="space-y-2">
              {keyPoints.map((k, i) => (
                <li key={i} dir="auto" className={"flex gap-3 text-slate-200" + big}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-300">{i + 1}</span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(lesson.example || lesson.exampleCode) && (
          <Section icon={lesson.exampleCode ? Code2 : Lightbulb} color="text-emerald-400" title="Example">
            {lesson.example && <p dir="auto" className={"leading-relaxed text-slate-200" + big}>💡 {lesson.example}</p>}
            {lesson.exampleCode && (
              <div className="relative mt-3">
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 text-sm text-emerald-200"><code>{lesson.exampleCode}</code></pre>
                <button onClick={copyCode} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </Section>
        )}

        {/* 💻 Code Lab: code badlo, result wahin */}
        {lesson.exampleCode && labTypeOf(lesson.exampleCode) && <CodeLab initialCode={lesson.exampleCode} />}

        {checks.length > 0 && (
          <Section icon={ListChecks} color="text-cyan-400" title="Check yourself">
            <ol className="space-y-2">
              {checks.map((q, i) => <CheckItem key={i} n={i + 1} q={q} />)}
            </ol>
          </Section>
        )}

        {finished && (
          <div className="page-enter flex flex-col items-start gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-5 text-slate-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-bold">🎉 Course completed!</p>
              <p className="text-sm">You finished every lesson. Your certificate is ready.</p>
            </div>
            <button onClick={() => nav(`/student/courses/${course.course._id}/certificate`)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">
              <Award className="h-4 w-4" /> View certificate
            </button>
          </div>
        )}
        {justDone && !finished && (
          <div className="page-enter rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Lesson completed ✅ {next ? "Ready for the next one?" : ""}
          </div>
        )}
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

        <div className="flex items-center justify-between gap-3">
          <button disabled={!prev} onClick={() => nav(`/student/lessons/${prev._id}`)}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-30">
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          {lesson.completed ? (
            <span className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </span>
          ) : (
            <button onClick={complete} disabled={saving}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50">
              {saving ? "Saving..." : "Mark as complete"}
            </button>
          )}
          <button disabled={!next} onClick={() => nav(`/student/lessons/${next._id}`)}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-30">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:sticky lg:top-4">
        <div>
          <div className="mb-1 flex justify-between text-sm text-slate-300"><span>Course progress</span><span>{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
        {course.modules.map((m) => (
          <div key={m._id}>
            <p dir="auto" className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{m.title}</p>
            {!m.lessons.length && <p className="px-2 py-1 text-xs text-slate-600">Coming soon</p>}
            {m.lessons.map((l) => {
              const current = String(l._id) === String(id);
              const isDone = done.has(String(l._id));
              return (
                <Link key={l._id} to={`/student/lessons/${l._id}`}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${current ? "bg-violet-500/20 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <PlayCircle className="h-4 w-4 shrink-0 text-slate-600" />}
                  <span dir="auto" className="truncate">{l.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
        {courseDone && !finished && (
          <button onClick={() => nav(`/student/courses/${course.course._id}/certificate`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-2 text-sm font-semibold text-slate-900">
            <Award className="h-4 w-4" /> View certificate
          </button>
        )}
      </aside>
    </div>
  );
}