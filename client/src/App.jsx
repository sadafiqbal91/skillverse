import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterInstitute from "./pages/RegisterInstitute";
import AccountPage from "./pages/AccountPage";
import Landing from "./pages/Landing";
import ChatPage from "./pages/ChatPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import RetestPage from "./pages/student/RetestPage";
import QuizPage from "./pages/student/QuizPage";
import NotesPage from "./pages/student/NotesPage";
import ProgressPage from "./pages/student/ProgressPage";
import CoursesPage from "./pages/student/CoursesPage";
import CoursePage from "./pages/student/CoursePage";
import LessonPage from "./pages/student/LessonPage";
import CertificatePage from "./pages/student/CertificatePage";
import CodeLabPage from "./pages/student/CodeLabPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCoursesPage from "./pages/teacher/TeacherCoursesPage";
import CourseBuilderPage from "./pages/teacher/CourseBuilderPage";
import QuizBuilderPage from "./pages/teacher/QuizBuilderPage";
import RevisionTestPage from "./pages/teacher/RevisionTestPage";
import GradingPage from "./pages/teacher/GradingPage";
import ResultsPage from "./pages/teacher/ResultsPage";
import WeakTopicsPage from "./pages/teacher/WeakTopicsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentLookupPage from "./pages/admin/StudentLookupPage";
import UsersPage from "./pages/admin/UsersPage";
import ParentDashboard from "./pages/parent/ParentDashboard";

function Soon({ title }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-gray-400">This page is coming soon 🚧</p>
    </div>
  );
}

const guard = (roles) => (
  <ProtectedRoute roles={roles}>
    <Layout />
  </ProtectedRoute>
);

const ALL_ROLES = ["student", "instructor", "orgadmin", "parent"];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/:slug" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:slug" element={<Register />} />
          <Route path="/start" element={<RegisterInstitute />} />

          <Route path="/account" element={guard(ALL_ROLES)}>
            <Route index element={<AccountPage />} />
          </Route>

          <Route path="/student" element={guard(["student"])}>
            <Route index element={<StudentDashboard />} />
            <Route path="retest/:id" element={<RetestPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:id" element={<CoursePage />} />
            <Route path="courses/:id/certificate" element={<CertificatePage />} />
            <Route path="lessons/:id" element={<LessonPage />} />
            <Route path="quiz/:id" element={<QuizPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="lab" element={<CodeLabPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="*" element={<Soon title="Student page" />} />
          </Route>

          <Route path="/teacher" element={guard(["instructor"])}>
            <Route index element={<TeacherDashboard />} />
            <Route path="courses" element={<TeacherCoursesPage />} />
            <Route path="courses/:id" element={<CourseBuilderPage />} />
            <Route path="courses/:id/revision" element={<RevisionTestPage />} />
            <Route path="quizzes/:id" element={<QuizBuilderPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="grading" element={<GradingPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="interventions" element={<WeakTopicsPage />} />
            <Route path="*" element={<Soon title="Teacher page" />} />
          </Route>

          <Route path="/admin" element={guard(["orgadmin"])}>
            <Route index element={<AdminDashboard />} />
            <Route path="results" element={<ResultsPage canRemind={false} />} />
            <Route path="students" element={<StudentLookupPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="*" element={<Soon title="Admin page" />} />
          </Route>

          <Route path="/parent" element={guard(["parent"])}>
            <Route index element={<ParentDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}