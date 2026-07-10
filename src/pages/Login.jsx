import { useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    LockKeyhole,
    Plane,
    ShieldCheck
} from "lucide-react";
import { api } from "../lib/api";
import { saveSession } from "../lib/storage";

function PremiumMessage({ type, title, message, onClose }) {
    if (!message) return null;

    const success = type === "success";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-start gap-4">
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            success
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                    >
                        {success ? (
                            <CheckCircle2 className="h-6 w-6" />
                        ) : (
                            <AlertTriangle className="h-6 w-6" />
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            {title}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-sky-700"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Login({ onLogin }) {
    const [form, setForm] = useState({
        username: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    function updateForm(field, value) {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.username.trim() || !form.password) {
            setMessage({
                type: "warning",
                title: "Missing login details",
                message: "Please enter your username and password."
            });
            return;
        }

        setSubmitting(true);

        try {
            const result = await api.login(form.username, form.password);

            if (!result.success) {
                setMessage({
                    type: "warning",
                    title: "Sign in failed",
                    message: result.message || "Invalid username or password."
                });
                return;
            }

            const session = {
                ...result.user,
                sessionToken: result.sessionToken,
                sessionExpiresAt: result.sessionExpiresAt
            };

            saveSession(session);

            setMessage({
                type: "success",
                title: "Welcome back",
                message: "Your secure session is ready. Preparing your dashboard..."
            });

            setTimeout(() => {
                onLogin(session);
            }, 700);
        } catch (error) {
            setMessage({
                type: "warning",
                title: "Connection error",
                message: error.message || "Unable to connect to the training portal."
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <PremiumMessage
                type={message?.type}
                title={message?.title}
                message={message?.message}
                onClose={() => setMessage(null)}
            />

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fbff,#eef5fb)] px-4 py-8 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#082f49,transparent_35%),linear-gradient(135deg,#020617,#0f172a)] dark:text-white">
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
                    <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 lg:grid-cols-[1.1fr_0.9fr]">
                        <section className="hidden bg-gradient-to-br from-sky-700 via-blue-800 to-slate-950 p-10 text-white lg:block">
                            <div className="flex h-full flex-col justify-between">
                                <div>
<div className="inline-flex rounded-2xl bg-white/95 p-3 shadow-lg">
    <img
        src="/UAPL-LMS/logo.png"
        alt="Apollo Global Academy Logo"
        className="h-12 w-auto object-contain"
    />
</div>

                                    <h1 className="mt-8 text-4xl font-black leading-tight">
                                        UAPL Training Portal
                                    </h1>

                                    <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-sky-100">
                                        A premium aviation learning dashboard for quiz practice,
                                        flashcards, module progress, and course notes.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="h-5 w-5 text-emerald-300" />
                                        <p className="text-sm font-black">Secure LMS Access</p>
                                    </div>

                                    <p className="mt-2 text-xs leading-6 text-sky-100">
                                        Account access is protected using server-side validation,
                                        session tokens, and admin-controlled student expiry.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="p-6 sm:p-8 lg:p-10">
                            <div className="mx-auto max-w-md">
<div className="flex items-center gap-3">
    <img
        src="/UAPL-LMS/logo.png"
        alt="Apollo Global Academy Logo"
        className="h-14 w-auto object-contain"
    />
</div>

                                <h2 className="mt-6 text-3xl font-black text-slate-950 dark:text-white">
                                    Sign in
                                </h2>

                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                                    Enter your credentials to continue to your UAPL dashboard.
                                </p>

                                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                                    <div>
                                        <label className="text-sm font-black text-slate-700 dark:text-slate-200">
                                            Username
                                        </label>

                                        <input
                                            value={form.username}
                                            onChange={event => updateForm("username", event.target.value)}
                                            autoComplete="username"
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                            placeholder="Enter username"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-black text-slate-700 dark:text-slate-200">
                                            Password
                                        </label>

                                        <div className="relative mt-2">
                                            <input
                                                value={form.password}
                                                onChange={event => updateForm("password", event.target.value)}
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                placeholder="Enter password"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(value => !value)}
                                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-60"
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <LockKeyhole className="h-4 w-4" />
                                        )}
                                        {submitting ? "Signing in..." : "Sign In"}
                                    </button>
                                </form>

                                <div className="mt-6 flex flex-col gap-3 text-center text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
                                    <Link
                                        to="/forgot-password"
                                        className="text-sky-700 transition hover:text-sky-900 dark:text-sky-300"
                                    >
                                        Forgot password?
                                    </Link>

                                    <Link
                                        to="/register"
                                        className="text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                                    >
                                        Create new account
                                    </Link>
                                </div>

                                <div className="mt-8 border-t border-slate-200 pt-5 text-center dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        Version 1.0 • Designed and built by Jairus
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
