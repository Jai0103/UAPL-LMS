import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import FlashcardManager from "./pages/FlashcardManager";
import QuizResults from "./pages/QuizResults";
import {
    clearSession,
    getSession,
    getTheme,
    initStorage,
    saveTheme,
    syncFromCloud
} from "./lib/storage";

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
    const [isBooting, setIsBooting] = useState(true);
    const [bootMessage, setBootMessage] = useState("Preparing dashboard...");

useEffect(() => {
    async function bootApp() {
        setBootMessage("Preparing dashboard...");

        initStorage();

        const savedTheme = getTheme();
        const savedSession = getSession();

        setTheme(savedTheme);
        setSession(savedSession);

        document.documentElement.classList.toggle("dark", savedTheme === "dark");

        try {
            setBootMessage("Syncing with training database...");
            await syncFromCloud();
        } catch (error) {
            console.error("Cloud sync failed:", error);
        } finally {
            setIsBooting(false);
        }
    }

    bootApp();
}, []);

   async function handleLogin(nextSession) {
    setSession(nextSession);
    setIsBooting(true);
    setBootMessage("Preparing dashboard...");

    try {
        setBootMessage("Syncing with training database...");
        await syncFromCloud();
    } catch (error) {
        console.error("Cloud sync failed:", error);
    } finally {
        setIsBooting(false);
    }
}

  function handleLogout() {
    clearSession();
    setSession(null);
}

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";

        setTheme(nextTheme);
        saveTheme(nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }

    if (isBooting) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 dark:bg-slate-950">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                </div>

                <h1 className="text-xl font-black text-slate-950 dark:text-white">
                    Apollo Global Academy
                </h1>

                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {bootMessage}
                </p>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-sky-500 to-emerald-400" />
                </div>
            </div>
        </div>
    );
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
    path="/quiz-results"
    element={
        <AdminRoute session={session}>
            <QuizResults />
        </AdminRoute>
    }
/>

                <Route
    path="/flashcard-manager"
    element={
        <AdminRoute session={session}>
            <FlashcardManager />
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
