import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Clock, ChevronLeft, ChevronRight, Send, Trophy, LifeBuoy, UserRound, Sprout, CheckCircle2, XCircle, ArrowLeft,
} from "lucide-react";
import api, { errMsg } from "../api/api";
import { Card, ProgressBar, ErrorBox, Loading } from "./ui";
import CountUp from "./CountUp";

const LETTERS = ["A", "B", "C", "D", "E"];

const celebrate = () => {
  const colors = ["#8b5cf6", "#22d3ee", "#34d399", "#fbbf24"];
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function QuizPlayer({ loader }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(Date.now());
  const autoSubmitted = useRef(false);

  useEffect(() => {
    loader().then(setSession).catch((e) => setError(errMsg(e)));
  }, [loader]);

  useEffect(() => {
    if (!session || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session, result]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })) };
      const { data } = await api.post(`/attempts/${session.attemptId}/submit`, payload);
      setResult(data);
      const recovered = data.interventions?.some((i) => i.level === "resolved");
      if (recovered || data.percent >= 80) celebrate();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = session ? new Date(session.expiresAt).getTime() - now : 0;
  useEffect(() => {
    if (session && !result && remaining <= 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit();
    }
  });

  if (error) return <ErrorBox text={error} />;
  if (!session) return <Loading />;
  if (result) return <Result result={result} title={session.title} onBack={() => navigate("/student")} onNotes={() => navigate("/student/notes")} />;

  const qs = session.questions;
  const q = qs[current];
  const answered = Object.keys(answers).length;
  const unanswered = qs.length - answered;
  const lowTime = remaining < 60000;

  const onSubmitClick = () => {
    if (unanswered > 0 && !confirming) return setConfirming(true);
    submit();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{session.title || "Quiz"}</h1>
          <p className="text-sm text-gray-400">
            Question {current + 1} of {qs.length} • {answered} answered
          </p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-lg ${lowTime ? "border-rose-500/40 bg-rose-500/10 text-rose-300 animate-pulse" : "border-white/10 bg-white/5"}`}>
          <Clock size={18} /> {fmt(remaining)}
        </div>
      </div>

      <ProgressBar value={Math.round((answered / qs.length) * 100)} />

      <Card key={q._id} className="page-enter">
        <div className="text-[11px] uppercase tracking-wider text-violet-300 mb-2">{q.topic}</div>
        <h2 className="text-xl font-semibold mb-6">{q.text}</h2>
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const selected = answers[q._id] === i;
            return (
              <button
                key={i}
                onClick={() => {
                  setAnswers({ ...answers, [q._id]: i });
                  setConfirming(false);
                }}
                className={`w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition ${
                  selected
                    ? "border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-900/30"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${selected ? "bg-violet-500 text-white" : "bg-white/10 text-gray-300"}`}>
                  {LETTERS[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        {qs.map((x, i) => (
          <button
            key={x._id}
            onClick={() => setCurrent(i)}
            className={`h-9 w-9 rounded-lg text-sm font-semibold transition ${
              i === current ? "bg-violet-600 text-white" : answers[x._id] !== undefined ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          disabled={current === 0}
          onClick={() => setCurrent(current - 1)}
          className="flex items-center gap-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-30 hover:bg-white/5"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {current < qs.length - 1 ? (
          <button onClick={() => setCurrent(current + 1)} className="flex items-center gap-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm hover:bg-white/15">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={onSubmitClick}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Send size={16} /> {submitting ? "Submitting..." : confirming ? "Submit anyway" : "Submit"}
          </button>
        )}
      </div>

      {confirming && unanswered > 0 && (
        <p className="text-center text-sm text-amber-300">
          You have {unanswered} unanswered question{unanswered > 1 ? "s" : ""}. Click "Submit anyway" to finish.
        </p>
      )}
    </div>
  );
}

function Result({ result, title, onBack, onNotes }) {
  const iv = result.interventions?.[0];
  const isRetest = result.kind === "retest";

  let tone = result.passed ? "emerald" : "rose";
  let Icon = result.passed ? Trophy : XCircle;
  let headline = result.passed ? "Well done!" : "Keep going!";
  let message = result.passed ? "You passed this quiz." : "This one was tough. Your weak topics are tracked below.";

  if (isRetest && iv?.level === "resolved") {
    headline = "Topic recovered! 🎉";
    message = `${iv.topic} is back on track. Your teacher and parents can see your improvement.`;
  } else if (isRetest && iv?.level === "intervention") {
    Icon = LifeBuoy;
    tone = "amber";
    headline = "Help is on the way";
    message = `Your teacher has been notified about ${iv.topic} and will send you notes. Read them, then try again.`;
  } else if (isRetest && iv?.level === "one_on_one") {
    Icon = UserRound;
    tone = "amber";
    headline = "Let's get you personal help";
    message = `Your teacher will give you 1-on-1 time for ${iv.topic}.`;
  }

  const ring = { emerald: "from-emerald-500 to-cyan-400", rose: "from-rose-500 to-pink-500", amber: "from-amber-500 to-orange-400" }[tone];
  const newPractice = !isRetest ? result.interventions?.filter((i) => i.level === "needs_practice") : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger">
      <Card className="text-center py-10">
        <div className={`mx-auto mb-5 h-20 w-20 rounded-2xl bg-gradient-to-br ${ring} flex items-center justify-center shadow-xl`}>
          <Icon size={38} className="text-white" />
        </div>
        <div className="text-sm text-gray-400">{title}</div>
        <div className="text-6xl font-extrabold tracking-tight my-2">
          <CountUp value={result.percent} suffix="%" />
        </div>
        <div className="text-gray-400 text-sm mb-4">
          {result.score} of {result.total} correct • Pass mark {result.passingMarks}%
        </div>
        <h2 className="text-2xl font-bold">{headline}</h2>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">{message}</p>
      </Card>

      <Card title="Topic breakdown">
        <ul className="space-y-4">
          {result.topicScores.map((t) => (
            <li key={t.topic}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2">
                  {t.percent >= result.passingMarks ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-rose-400" />}
                  {t.topic}
                </span>
                <span className="text-gray-400">{t.correct}/{t.total} • {t.percent}%</span>
              </div>
              <ProgressBar value={t.percent} />
            </li>
          ))}
        </ul>
      </Card>

      {newPractice?.length > 0 && (
        <Card title="Added to Needs Practice" icon={Sprout} className="border-emerald-500/20">
          <p className="text-sm text-gray-400">
            {newPractice.map((p) => p.topic).join(", ")} will get a short re-test on your dashboard.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onBack} className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold hover:opacity-90">
          Back to dashboard
        </button>
        <button onClick={onNotes} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm hover:bg-white/5">
          My notes
        </button>
      </div>
    </div>
  );
}