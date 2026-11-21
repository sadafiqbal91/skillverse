// Browser khud bol kar sunaye (internet/AI ki zaroorat nahi)
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export const speak = (text, lang = "en", onEnd) => {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const want = lang === "ur" ? ["ur", "hi"] : ["en"];
  const voice = voices.find((v) => want.some((w) => v.lang.toLowerCase().startsWith(w)));
  if (voice) u.voice = voice;
  u.lang = voice?.lang || (lang === "ur" ? "hi-IN" : "en-US");
  u.rate = 0.9;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
};

export const stopSpeak = () => canSpeak() && window.speechSynthesis.cancel();