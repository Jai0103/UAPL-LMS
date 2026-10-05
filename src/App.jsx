import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AlertTriangle, LogOut, RotateCcw } from "lucide-react";
import { api } from "./lib/api";
import {
    clearSession,
    getSession,
    getTheme,
    hasCachedTrainingData,
    initStorage,
    saveSession,
    saveTheme,
    syncFromCloud
} from "./lib/storage";

import Layout from "./components/Layout";
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
    if (session.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default function App() {
    const [session, setSession] = useState(null);
    const [theme, setTheme] = useState("light");
    const [isBooting, setIsBooting] = useState(true);
    const [bootError, setBootError] = useState("");

    const validationRef = useRef({
        running: false,
        lastRun: 0
    });

    useEffect(() => {
        initStorage();

        const savedTheme = getTheme();
        const savedSession = getSession();

        setTheme(savedTheme);

        document.documentElement.classList.toggle(
            "dark",
            savedTheme === "dark"
        );

        if (savedSession?.sessionToken) {
            prepareSignedInApp(savedSession);
        } else {
            clearSession();
            setSession(null);
            setIsBooting(false);
        }
    }, []);

    useEffect(() => {
        if (!session) return;

        const firstValidation = setTimeout(() => {
            validateCurrentSession({ force: true });
        }, 12000);

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

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        return () => {
            clearTimeout(firstValidation);
            clearInterval(interval);

            window.removeEventListener("focus", handleFocus);

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [session]);

    useEffect(() => {
        if (!session) return;

        const idleLimit = 5 * 60 * 1000;
        let idleTimer;

        function logoutDueToInactivity() {
            handleLogout();

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

    async function prepareSignedInApp(nextSession) {
        const hasTrustedCache = hasCachedTrainingData(nextSession);

        setSession(nextSession);
        setBootError("");
        setIsBooting(!hasTrustedCache);

        try {
            await syncFromCloud({
                force: !hasTrustedCache,
                maxAgeMs: 90000
            });
        } catch (error) {
            console.error("Training data sync failed:", error);

            if (
                !hasTrustedCache &&
                getSession()?.sessionToken === nextSession.sessionToken
            ) {
                setBootError(
                    "We couldn't load your training data. Please check your connection and try again."
                );
            }
        } finally {
            if (
                getSession()?.sessionToken === nextSession.sessionToken
            ) {
                setIsBooting(false);
            }
        }
    }

    function handleLogin(nextSession) {
        saveSession(nextSession);
        prepareSignedInApp(nextSession);
    }

    function handleLogout() {
        clearSession();
        setSession(null);
        setIsBooting(false);
        setBootError("");
    }

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";

        setTheme(nextTheme);
        saveTheme(nextTheme);

        document.documentElement.classList.toggle(
            "dark",
            nextTheme === "dark"
        );
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
        handleLogout();

        window.alert(
            message ||
                "Your session is no longer active. Please sign in again."
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
        const {
            force = false,
            minIntervalMs = 45000
        } = options;

        const now = Date.now();

        if (validationRef.current.running) return;

        if (
            !force &&
            now - validationRef.current.lastRun < minIntervalMs
        ) {
            return;
        }

        const currentSession = getSession();

        if (!currentSession?.sessionToken) {
            forceLogout(
                "Your secure session has expired. Please sign in again."
            );
            return;
        }

        validationRef.current.running = true;
        validationRef.current.lastRun = now;

        try {
            const result = await api.validateSessionStatus();

            if (!result.success) {
                if (shouldForceLogoutFromMessage(result.message)) {
                    forceLogout(
                        result.message ||
                            "Your session has expired. Please sign in again."
                    );
                } else {
                    console.warn(
                        "Session validation skipped:",
                        result.message
                    );
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

                return hasSessionProfileChanged(
                    previousSession,
                    nextSession
                )
                    ? nextSession
                    : previousSession;
            });
        } catch (error) {
            console.error("Session validation failed:", error);
        } finally {
            validationRef.current.running = false;
        }
    }

    if (isBooting || bootError) {
        return (
            <div
                role={bootError ? "alert" : "status"}
                aria-busy={isBooting}
                className="flex min-h-screen items-center justify-center bg-slate-100 px-6 dark:bg-slate-950"
            >
                <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        {bootError ? (
                            <AlertTriangle className="h-6 w-6" />
                        ) : (
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                        )}
                    </div>

                    <h1 className="text-xl font-black text-slate-950 dark:text-white">
                        Apollo Global Academy
                    </h1>

                    <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {bootError || "Loading your training data..."}
                    </p>

                    {bootError && (
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const currentSession = getSession();

                                    if (currentSession?.sessionToken) {
                                        prepareSignedInApp(currentSession);
                                    } else {
                                        handleLogout();
                                    }
                                }}
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Try again
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </div>
                    )}
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
                <Route
                    path="/dashboard"
                    element={<Dashboard session={session} />}
                />

                <Route
                    path="/learning"
                    element={
                        <AdminRoute session={session}>
                            <Learning session={session} />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/quiz"
                    element={<Quiz session={session} />}
                />

                <Route
                    path="/flashcards"
                    element={<Flashcards session={session} />}
                />

                <Route
                    path="/course-notes"
                    element={<CourseNotes session={session} />}
                />

                <Route
                    path="/settings"
                    element={<Settings session={session} />}
                />

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

            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />
        </Routes>
    );
}
