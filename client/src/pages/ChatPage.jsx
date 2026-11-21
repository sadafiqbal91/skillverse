import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Send, HelpCircle, Bot, Check, Pencil, Trash2, GraduationCap } from "lucide-react";
import api, { errMsg } from "../api/api";
import { useAuth } from "../context/AuthContext";

const when = (d) => {
  const t = new Date(d);
  const time = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return t.toDateString() === new Date().toDateString() ? time : t.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + time;
};

// 🤖 / 👩‍🏫 jawab, sawal ke neeche
function Reply({ r, canModerate, onApprove, onCorrect, onDelete }) {
  const isAI = r.kind === "ai";
  const status = !isAI ? null
    : r.review === "approved" ? ["✅ Checked by your teacher", "text-emerald-300"]
    : r.review === "corrected" ? ["✏️ Your teacher added an answer below", "text-amber-300"]
    : ["⏳ AI help · your teacher will review", "text-violet-300"];

  return (
    <div className={"ml-6 mt-2 rounded-2xl border p-3 text-sm " + (isAI ? "border-violet-500/30 bg-violet-500/10" : "border-emerald-500/30 bg-emerald-500/10")}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold">
          {isAI ? <Bot size={14} className="text-violet-300" /> : <GraduationCap size={14} className="text-emerald-300" />}
          {isAI ? "AI Helper" : r.name + " (Teacher)"}
        </span>
        <span className="text-gray-500">{when(r.createdAt)}</span>
      </div>
      <p className="whitespace-pre-line text-gray-100">{r.text}</p>
      {status && <p className={"mt-1.5 text-[11px] " + status[1]}>{status[0]}</p>}
      {canModerate && isAI && r.review === "pending" && (
        <div className="mt-2 flex gap-2">
          <button onClick={onApprove} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold hover:bg-emerald-500">
            <Check size={13} /> Approve
          </button>
          <button onClick={onCorrect} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20">
            <Pencil size={13} /> Correct it
          </button>
        </div>
      )}
      {canModerate && !isAI && (
        <button onClick={onDelete} className="mt-1 text-[11px] text-gray-500 hover:text-rose-300">Delete</button>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "instructor";
  const [params, setParams] = useSearchParams();
  const [rooms, setRooms] = useState(null);
  const [room, setRoom] = useState(null);
  const [text, setText] = useState("");
  const [ask, setAsk] = useState(!isTeacher);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [answering, setAnswering] = useState(null); // question id
  const [answerText, setAnswerText] = useState("");
  const bottom = useRef(null);
  const lastCount = useRef(0);

  const courseId = params.get("c") || rooms?.[0]?._id;

  const loadRooms = useCallback(() => {
    api.get("/chat/rooms").then((r) => setRooms(r.data.rooms)).catch((e) => setError(errMsg(e)));
  }, []);

  const loadRoom = useCallback(() => {
    if (!courseId) return;
    api.get("/chat/course/" + courseId).then((r) => setRoom(r.data)).catch((e) => setError(errMsg(e)));
  }, [courseId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // 🔄 Har 5 second naye messages, har 20 second rooms
  useEffect(() => {
    setRoom(null);
    lastCount.current = 0;
    loadRoom();
    const a = setInterval(loadRoom, 5000);
    const b = setInterval(loadRooms, 20000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [loadRoom, loadRooms]);

  // Naya message aaye to neeche scroll
  useEffect(() => {
    const n = room?.messages?.length || 0;
    if (n > lastCount.current) bottom.current?.scrollIntoView({ behavior: lastCount.current ? "smooth" : "auto", block: "nearest" });
    lastCount.current = n;
  }, [room]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    setNote("");
    try {
      const { data } = await api.post("/chat/course/" + courseId, { text, ask });
      setText("");
      if (data.note) setNote(data.note);
      loadRoom();
      loadRooms();
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setSending(false);
    }
  };

  const act = async (fn) => {
    setError("");
    try {
      await fn();
      loadRoom();
      loadRooms();
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const approve = (qid) => act(() => api.patch("/chat/" + qid + "/approve"));
  const remove = (id) => { if (window.confirm("Delete this message?")) act(() => api.delete("/chat/" + id)); };
  const sendAnswer = (qid) => act(async () => {
    await api.post("/chat/" + qid + "/answer", { text: answerText });
    setAnswering(null);
    setAnswerText("");
  });

  if (error && !rooms) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>;
  if (!rooms) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" />;

  const msgs = room?.messages || [];
  const replies = {};
  msgs.filter((m) => m.replyTo).forEach((m) => { (replies[m.replyTo] ||= []).push(m); });
  let top = msgs.filter((m) => !m.replyTo);
  if (onlyWaiting) top = top.filter((m) => m.kind === "question" && !m.answered);
  const waiting = msgs.filter((m) => m.kind === "question" && !m.answered).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <MessageCircle className="text-violet-400" /> Class Chat
        </h1>
        <p className="mt-1 text-gray-400">
          {isTeacher
            ? "Talk with your class. Check the AI's answers to student questions: approve or correct them."
            : "Talk with your class. Stuck? Tap ❓ Ask teacher: AI answers right away, then your teacher checks it."}
        </p>
      </div>

      {!rooms.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-gray-400">
          No classes yet. Join a course first.
        </div>
      ) : (
        <>
          {/* Rooms */}
          <div className="flex flex-wrap gap-2">
            {rooms.map((r) => (
              <button key={r._id} onClick={() => setParams({ c: r._id })}
                className={"relative rounded-xl px-4 py-2 text-sm font-medium transition " + (String(r._id) === String(courseId) ? "bg-violet-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10")}>
                {r.title}
                {isTeacher && r.pending > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-black">{r.pending}</span>
                )}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <p className="font-semibold">{room?.course?.title || "..."}</p>
              {room?.canModerate && (
                <button onClick={() => setOnlyWaiting((v) => !v)}
                  className={"rounded-lg px-3 py-1.5 text-xs font-semibold " + (onlyWaiting ? "bg-amber-500 text-black" : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25")}>
                  {onlyWaiting ? "Show all messages" : "⏳ Waiting for you (" + waiting + ")"}
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="h-[55vh] space-y-4 overflow-y-auto p-4">
              {!room && <div className="h-full animate-pulse rounded-xl bg-white/5" />}
              {room && !top.length && (
                <p className="pt-10 text-center text-sm text-gray-500">
                  {onlyWaiting ? "No questions waiting 🎉" : "No messages yet. Say hello 👋"}
                </p>
              )}
              {top.map((m) => {
                const isQ = m.kind === "question";
                const teach = m.role === "instructor";
                return (
                  <div key={m._id} className={m.mine && !isQ ? "flex flex-col items-end" : ""}>
                    <div className={"max-w-[85%] rounded-2xl border p-3 text-sm " + (isQ ? "max-w-full border-amber-500/30 bg-amber-500/10" : teach ? "border-emerald-500/30 bg-emerald-500/10" : m.mine ? "border-violet-500/40 bg-violet-600/20" : "border-white/10 bg-black/20")}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {isQ && <HelpCircle size={14} className="text-amber-300" />}
                          {m.mine ? "You" : m.name}{teach ? " (Teacher)" : ""}
                          {isQ && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">Question</span>}
                          {isQ && m.answered && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">Checked ✓</span>}
                        </span>
                        <span className="text-gray-500">{when(m.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-line text-gray-100">{m.text}</p>
                      {(m.mine || room?.canModerate) && (
                        <button onClick={() => remove(m._id)} className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-rose-300">
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                    </div>

                    {(replies[m._id] || []).map((r) => (
                      <Reply key={r._id} r={r} canModerate={room?.canModerate}
                        onApprove={() => approve(m._id)}
                        onCorrect={() => { setAnswering(m._id); setAnswerText(""); }}
                        onDelete={() => remove(r._id)} />
                    ))}

                    {/* Teacher: jawab likho */}
                    {room?.canModerate && isQ && (
                      answering === m._id ? (
                        <div className="ml-6 mt-2 space-y-2">
                          <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={3} autoFocus
                            placeholder="Write your answer for the student..."
                            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-emerald-500" />
                          <div className="flex gap-2">
                            <button onClick={() => sendAnswer(m._id)} disabled={!answerText.trim()}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-40">Send answer</button>
                            <button onClick={() => setAnswering(null)} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                          </div>
                        </div>
                      ) : !m.answered && !(replies[m._id] || []).some((r) => r.kind === "ai") && (
                        <button onClick={() => { setAnswering(m._id); setAnswerText(""); }}
                          className="ml-6 mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500">
                          <Pencil size={13} /> Answer
                        </button>
                      )
                    )}
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>

            {/* Input */}
            {room?.canPost ? (
              <form onSubmit={send} className="space-y-2 border-t border-white/10 p-3">
                {!isTeacher && (
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => setAsk(true)}
                      className={"inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold " + (ask ? "bg-amber-500 text-black" : "bg-white/5 text-gray-400 hover:text-white")}>
                      <HelpCircle size={13} /> Ask teacher
                    </button>
                    <button type="button" onClick={() => setAsk(false)}
                      className={"inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold " + (!ask ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:text-white")}>
                      <MessageCircle size={13} /> Chat with class
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
                    placeholder={isTeacher ? "Message your class..." : ask ? "What do you want to ask? e.g. What is a CPU?" : "Message your class..."}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                  <button disabled={sending || !text.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40">
                    <Send size={15} /> {sending ? (ask && !isTeacher ? "AI is thinking..." : "Sending...") : "Send"}
                  </button>
                </div>
                {note && <p className="text-xs text-amber-300">⚠️ {note}</p>}
                {error && <p className="text-xs text-rose-300">{error}</p>}
              </form>
            ) : (
              room && <p className="border-t border-white/10 p-3 text-center text-xs text-gray-500">You can read this chat.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}