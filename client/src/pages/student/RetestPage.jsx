import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserRound, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import api, { errMsg } from "../../api/api";
import QuizPlayer from "../../components/QuizPlayer";
import { Loading, ErrorBox } from "../../components/ui";
import { RoundDots } from "../../components/NeedsPracticeCard";

function InfoCard({ icon: Icon, tone, title, children, onBack }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center page-enter">
      <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm text-gray-400">{children}</div>
      <button onClick={onBack} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20">
        <ArrowLeft size={16} /> Back to dashboard
      </button>
    </div>
  );
}

export default function RetestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [iv, setIv] = useState(undefined); // undefined = loading, null = not active
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/interventions/me")
      .then((r) => setIv(r.data.interventions.find((x) => x._id === id) || null))
      .catch((e) => setError(errMsg(e)));
  }, [id]);

  const loader = useCallback(() => api.post(`/interventions/${id}/retest`).then((r) => r.data), [id]);
  const back = () => navigate("/student");

  if (error) return <ErrorBox text={error} />;
  if (iv === undefined) return <Loading />;

  if (iv === null) {
    return (
      <InfoCard icon={CheckCircle2} tone="bg-emerald-500/15 text-emerald-300" title="All done here 🎉" onBack={back}>
        <p>This topic is already back on track. No re-test needed.</p>
      </InfoCard>
    );
  }

  const max = iv.maxRounds || 3;
  const left = iv.retestsLeft ?? max;

  if (iv.level === "one_on_one" || left === 0) {
    return (
      <InfoCard icon={UserRound} tone="bg-amber-500/15 text-amber-300" title={`You tried ${max} times. Well done for not giving up 💪`} onBack={back}>
        <div className="flex justify-center"><RoundDots retestsLeft={0} maxRounds={max} /></div>
        <p>
          Some topics need a little personal help. Your teacher will sit with you on <span className="font-semibold text-white">{iv.topic}</span>.
          Your parents have been told too.
        </p>
      </InfoCard>
    );
  }

  if (iv.level === "intervention" && !iv.notesSent) {
    return (
      <InfoCard icon={Clock} tone="bg-violet-500/15 text-violet-300" title="Waiting for your teacher's notes 📄" onBack={back}>
        <div className="flex justify-center"><RoundDots retestsLeft={left} maxRounds={max} /></div>
        <p>
          Your teacher is preparing notes on <span className="font-semibold text-white">{iv.topic}</span>.
          You will get a notification, then re-test {max - left + 1} of {max} will open.
        </p>
      </InfoCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm">
        <RoundDots retestsLeft={left} maxRounds={max} />
        <span className="text-gray-300">
          Re-test <span className="font-semibold text-white">{max - left + 1} of {max}</span> · {iv.topic}
        </span>
        {left === 1 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">Last chance, take your time 🙂</span>}
      </div>
      <QuizPlayer loader={loader} />
    </div>
  );
}