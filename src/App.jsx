import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getSession, getTheme, initStorage, saveTheme } from "./lib/storage";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Quiz from "./pages/Quiz";
import Flashcards from "./pages/Flashcards";
import CourseNotes from "./pages/CourseNotes";
import QuizManager from "./pages/QuizManager";
import UserManagement from "./pages/Users";
import ImportBackup from "./pages/ImportBackup";
import Settings from "./pages/Settings";

function ProtectedRoute({ session, children }) {
    if (!session) return <Navigate to="/login" replace />;
    return children;
}

function AdminRoute({ session, children }) {
    if (!session) return <Navigate to="/login" replace />;
    if (session.role !== "admin") return <Navigate to="/dashboard" replace />;
    return children;
}

export default function App() {
    const [session, setSession] = useState(null);
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        initStorage();

        const savedTheme = getTheme();
        const savedSession = getSession();

        setTheme(savedTheme);
        setSession(savedSession);

        document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }, []);

    function handleLogin(nextSession) {
        setSession(nextSession);
    }

    function handleLogout() {
        setSession(null);
    }

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";

        setTheme(nextTheme);
        saveTheme(nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    session ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <Login onLogin={handleLogin} />
                    )
                }
            />

            <Route
                path="/"
                element={
                    session ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />

            <Route
                element={
                    <ProtectedRoute session={session}>
                        <Layout
                            session={session}
                            theme={theme}
                            onThemeToggle={toggleTheme}
                            onLogout={handleLogout}
                        />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<Dashboard session={session} />} />
                <Route path="/quiz" element={<Quiz session={session} />} />
                <Route path="/flashcards" element={<Flashcards session={session} />} />
                <Route path="/course-notes" element={<CourseNotes session={session} />} />
                <Route path="/settings" element={<Settings session={session} />} />

                <Route
                    path="/quiz-manager"
                    element={
                        <AdminRoute session={session}>
                            <QuizManager session={session} />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/users"
                    element={
                        <AdminRoute session={session}>
                            <UserManagement session={session} />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/import-backup"
                    element={
                        <AdminRoute session={session}>
                            <ImportBackup />
                        </AdminRoute>
                    }
                />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
