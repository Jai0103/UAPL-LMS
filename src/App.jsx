import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./lib/api";
import {
    clearSession,
    getSession,
    getTheme,
    initStorage,
    saveSession,
    saveTheme,
    syncFromCloud
} from "./lib/storage";

import Layout from "./components/Layout";
import PwaManager from "./components/PwaManager";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Learning from "./pages/Learning";
import Quiz from "./pages/Quiz";
import Flashcards from "./pages/Flashcards";
import CourseNotes from "./pages/CourseNotes";
import QuizManager from "./pages/QuizManager";
import FlashcardManager from "./pages/FlashcardManager";
import LearningManager from "./pages/LearningManager";
import QuizResults from "./pages/QuizResults";
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
    const [bootMessage] = useState("Preparing dashboard...");

    const validationRef = useRef({
        running: false,
        lastRun: 0
    });

    useEffect(() => {
        initStorage();

        const savedTheme = getTheme();
        const savedSession = getSession();

        setTheme(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");

        if (savedSession?.sessionToken) {
            setSession(savedSession);

            syncFromCloud().catch(error => {
                console.error("Background sync failed:", error);
            });
        } else {
            clearSession();
            setSession(null);
        }

        setIsBooting(false);
    }, []);

    useEffect(() => {
        if (!session) return;

        validateCurrentSession({ force: true });

        const interval = setInterval(() => {
            validateCurrentSession({ minIntervalMs: 55000 });
        }, 60000);

        function handleFocus() {
            validateCurrentSession({ minIntervalMs: 45000 });
        }

        function handleVisibilityChange() {
            if (!document.hidden) {
                validateCurrentSession({ minIntervalMs: 45000 });
            }
        }

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [session]);

    useEffect(() => {
        if (!session) return;

        const idleLimit = 5 * 60 * 1000;
        let idleTimer;

        function logoutDueToInactivity() {
            clearSession();
            setSession(null);

            window.alert(
                "You have been signed out because your session was inactive for 5 minutes."
            );
        }

        function resetIdleTimer() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(logoutDueToInactivity, idleLimit);
        }

        const activityEvents = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
            "click"
        ];

        activityEvents.forEach(eventName => {
            window.addEventListener(eventName, resetIdleTimer);
        });

        resetIdleTimer();

        return () => {
            clearTimeout(idleTimer);

            activityEvents.forEach(eventName => {
                window.removeEventListener(eventName, resetIdleTimer);
            });
        };
    }, [session]);

    function handleLogin(nextSession) {
        setSession(nextSession);

        syncFromCloud().catch(error => {
            console.error("Background sync failed:", error);
        });
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

    function isAccountExpired(user) {
        if (String(user.role).toLowerCase() === "admin") return false;
        if (!user.expiryDate) return false;

        const today = new Date();
        const expiry = new Date(user.expiryDate);

        if (Number.isNaN(expiry.getTime())) return false;

        expiry.setHours(23, 59, 59, 999);
        return today > expiry;
    }

    function forceLogout(message) {
        clearSession();
        setSession(null);

        window.alert(
            message || "Your session is no longer active. Please sign in again."
        );
    }

    function shouldForceLogoutFromMessage(message) {
        const text = String(message || "").toLowerCase();

        return (
            text.includes("session expired") ||
            text.includes("session token is required") ||
            text.includes("account is inactive") ||
            text.includes("account was not found") ||
            text.includes("account access is no longer active")
        );
    }

    function hasSessionProfileChanged(previousSession, nextSession) {
        if (!previousSession || !nextSession) return true;

        return [
            "id",
            "name",
            "username",
            "role",
            "status",
            "expiryDate",
            "createdAt",
            "lastLogin"
        ].some(
            key =>
                String(previousSession[key] || "") !==
                String(nextSession[key] || "")
        );
    }

    async function validateCurrentSession(options = {}) {
        const { force = false, minIntervalMs = 45000 } = options;
        const now = Date.now();

        if (validationRef.current.running) return;

        if (!force && now - validationRef.current.lastRun < minIntervalMs) {
            return;
        }

        const currentSession = getSession();

        if (!currentSession?.sessionToken) {
            forceLogout("Your secure session has expired. Please sign in again.");
            return;
        }

        validationRef.current.running = true;
        validationRef.current.lastRun = now;

        try {
            const result = await api.validateSessionStatus();

            if (!result.success) {
                if (shouldForceLogoutFromMessage(result.message)) {
                    forceLogout(
                        result.message || "Your session has expired. Please sign in again."
                    );
                } else {
                    console.warn("Session validation skipped:", result.message);
                }

                return;
            }

            const latestUser = result.currentUser;

            const shouldLogout =
                !latestUser ||
                String(latestUser.status).toLowerCase() !== "active" ||
                isAccountExpired(latestUser);

            if (shouldLogout) {
                forceLogout(
                    "Your account access is no longer active. You have been signed out automatically."
                );
                return;
            }

            const nextSession = {
                ...currentSession,
                ...latestUser,
                sessionToken: currentSession.sessionToken,
                sessionExpiresAt: currentSession.sessionExpiresAt
            };

            saveSession(nextSession);

            setSession(previousSession => {
                if (!previousSession) return previousSession;

                return hasSessionProfileChanged(previousSession, nextSession)
                    ? nextSession
                    : previousSession;
            });
        } catch (error) {
            console.error("Session validation failed:", error);
        } finally {
            validationRef.current.running = false;
        }
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
                </div>
            </div>
        );
    }

    return (
        <>
            <PwaManager />

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
                    path="/register"
                    element={
                        session ? (
                            <Navigate to="/dashboard" replace />
                        ) : (
                            <Register />
                        )
                    }
                />

                <Route
                    path="/forgot-password"
                    element={
                        session ? (
                            <Navigate to="/dashboard" replace />
                        ) : (
                            <ForgotPassword />
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

                    <Route
                        path="/learning"
                        element={
                            <AdminRoute session={session}>
                                <Learning session={session} />
                            </AdminRoute>
                        }
                    />

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
                        path="/flashcard-manager"
                        element={
                            <AdminRoute session={session}>
                                <FlashcardManager />
                            </AdminRoute>
                        }
                    />

                    <Route
                        path="/learning-manager"
                        element={
                            <AdminRoute session={session}>
                                <LearningManager />
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
        </>
    );
}
