import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, Download, Lock } from "lucide-react";
import api from "../../api/api";

const msg = (e) => e.response?.data?.message || "Something went wrong";

export default function CertificatePage() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [locked, setLocked] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/courses/${id}/certificate`)
      .then((r) => setCert(r.data))
      .catch((e) => (e.response?.status === 400 ? setLocked(e.response.data) : setError(msg(e))));
  }, [id]);

  if (error) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;

  if (locked) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15">
          <Lock className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Certificate locked</h2>
        <p className="mt-1 text-sm text-slate-400">{locked.courseTitle}</p>
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-sm text-slate-300"><span>Progress</span><span>{locked.progressPercent}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${locked.progressPercent}%` }} />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">Complete all lessons to unlock your certificate.</p>
        <Link to={`/student/courses/${id}`} className="mt-6 inline-block rounded-xl bg-violet-600 px-5 py-2 font-semibold text-white hover:bg-violet-500">
          Continue course
        </Link>
      </div>
    );
  }

  if (!cert) return <div className="mx-auto h-[480px] max-w-4xl animate-pulse rounded-3xl bg-white/5" />;

  const date = new Date(cert.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link to={`/student/courses/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div className="print-area rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-[3px] shadow-2xl shadow-violet-900/30">
        <div className="relative overflow-hidden rounded-[22px] bg-[#fdfbf5] px-8 py-12 text-center text-slate-800 md:px-14">
          <div className="pointer-events-none absolute inset-3 rounded-2xl border border-amber-300/70" />
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-amber-200/50 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-700">SkillVerse • {cert.institute}</p>
            <h1 className="mt-3 font-serif text-3xl tracking-wide text-slate-900 md:text-4xl">Certificate of Completion</h1>
            <p className="mt-8 text-sm text-slate-500">This is proudly presented to</p>
            <p className="mt-2 font-serif text-4xl italic text-violet-800 md:text-5xl">{cert.studentName}</p>
            <div className="mx-auto mt-3 h-px w-72 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            <p className="mt-5 text-sm text-slate-500">for successfully completing the course</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{cert.courseTitle}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-800">{cert.lessons} lessons completed</span>
              {cert.averageQuizPercent !== null && cert.averageQuizPercent !== undefined && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Quiz average {cert.averageQuizPercent}%</span>
              )}
            </div>

            <div className="mt-12 grid grid-cols-3 items-end gap-4">
              <div>
                <p className="font-serif text-lg italic text-slate-800">{cert.instructorName}</p>
                <div className="mx-auto mt-1 h-px w-40 bg-slate-400" />
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Instructor</p>
              </div>
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg ring-4 ring-amber-200">
                  <Award className="h-10 w-10 text-white" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-slate-800">{date}</p>
                <div className="mx-auto mt-1 h-px w-40 bg-slate-400" />
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">Date</p>
              </div>
            </div>

            <p className="mt-10 font-mono text-[11px] tracking-widest text-slate-400">CERTIFICATE ID: SV-{cert.certificateId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}