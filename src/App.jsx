import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getSession, getTheme, initStorage, saveTheme } from "./lib/storage";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Quiz from "./pages/Quiz";
import Flashcards from "./pages/Flashcards";
import QuizManager from "./pages/QuizManager";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import CourseNotes from "./pages/CourseNotes";

<Route path="/course-notes" element={<CourseNotes user={user} />} />

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    initStorage();
    const savedTheme = getTheme();
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    setUser(getSession());
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Layout user={user} onLogout={() => setUser(null)} theme={theme} toggleTheme={toggleTheme}>
      <Routes>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/flashcards" element={<Flashcards />} />
        <Route path="/quiz-manager" element={<QuizManager user={user} />} />
        <Route path="/users" element={<Users user={user} />} />
        <Route path="/settings" element={<Settings theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
