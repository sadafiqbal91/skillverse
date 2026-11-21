const Question = require("../models/Question");

// Ek attempt → har sawal: bachche ka jawab vs sahi jawab
const buildAnswers = async (attempt) => {
  const ids = attempt.answers.map((a) => a.questionId);
  const qs = await Question.find({ _id: { $in: ids } }).select("+correctIndex text options topic");
  const map = new Map(qs.map((q) => [String(q._id), q]));

  const items = attempt.answers
    .map((a, i) => {
      const q = map.get(String(a.questionId));
      if (!q) return null;
      return {
        n: i + 1,
        text: q.text,
        topic: q.topic,
        options: q.options,
        chosen: a.selectedIndex ?? null,
        correct: q.correctIndex,
        isCorrect: !!a.isCorrect,
      };
    })
    .filter(Boolean);

  return {
    _id: attempt._id,
    quiz: attempt.quizId?.title || "Quiz",
    kind: attempt.kind,
    percent: attempt.percent,
    submittedAt: attempt.submittedAt,
    correct: items.filter((x) => x.isCorrect).length,
    total: items.length,
    items,
  };
};

module.exports = { buildAnswers };