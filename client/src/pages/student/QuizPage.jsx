import { useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";
import QuizPlayer from "../../components/QuizPlayer";

export default function QuizPage() {
  const { id } = useParams();
  const loader = useCallback(() => api.post(`/quizzes/${id}/attempts`).then((r) => ({ title: "Quiz", ...r.data })), [id]);
  return <QuizPlayer loader={loader} />;
}