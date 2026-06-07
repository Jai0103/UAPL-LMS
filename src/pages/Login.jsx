import { useState } from "react";
import { FileText, Lock, Loader2, Plane, ShieldCheck, User } from "lucide-react";
import { authenticateUser } from "../lib/auth";
import PremiumDialog from "../components/PremiumDialog";

export default function Login({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState(null);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!username || !password) {
            setDialog({
                type: "warning",
                title: "Login Details Required",
                message: "Please enter your username and password to access the UAPL LMS.",
                confirmText: "Continue",
                onConfirm: () => setDialog(null)
            });
            return;
        }

        setLoading(true);

        try {
            const result = await authenticateUser(username, password);

            if (!result.success) {
                setDialog({
                    type: "danger",
                    title: "Sign In Failed",
                    message: result.message,
                    confirmText: "Try Again",
                    onConfirm: () => setDialog(null)
                });
                return;
            }

            setDialog({
                type: "success",
                title: "Welcome Back",
                message: `Access granted. Welcome to your UAPL training dashboard, ${result.user.name}.`,
                confirmText: "Enter Dashboard",
                onConfirm: () => {
                    setDialog(null);
                    onLogin(result.user);
                }
            });
        } catch {
            setDialog({
                type: "danger",
                title: "Connection Error",
                message: "Unable to connect to the Google Sheets backend. Please check the Apps Script Web App URL or internet connection.",
                confirmText: "Close",
                onConfirm: () => setDialog(null)
            });
        } finally {
            setLoading(false);
        }
    }

function openDisclaimer() {
    setDialog({
        type: "info",
        title: "Disclaimer",
        justify: true,
        message: `This project is an independent educational resource and is not affiliated with, endorsed by, or connected to the Civil Aviation Authority of Singapore (CAAS).

All quiz questions, explanations, flashcards, and course notes are provided for training, revision, and self-assessment purposes only. They should not be treated as official regulatory guidance, examination material, or legal advice.

Users remain responsible for checking the latest official CAAS publications, rules, regulations, advisories, and requirements before conducting any unmanned aircraft operation.`,
        confirmText: "I Understand",
        onConfirm: () => setDialog(null)
    });
}

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
            <PremiumDialog open={!!dialog} {...dialog} />

            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.16),transparent_30%)]" />

            <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
                <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-premium backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="hidden bg-gradient-to-br from-blue-700 via-slate-900 to-cyan-700 p-10 text-white lg:block">
                        <div className="flex h-full flex-col justify-between">
                            <div>
                                <div className="mb-8 inline-flex rounded-2xl bg-white/10 p-4">
                                    <Plane size={36} />
                                </div>

                                <h1 className="text-4xl font-black leading-tight">
                                    UAPL Training Portal
                                </h1>

                                <p className="mt-4 max-w-md text-sm leading-7 text-blue-100">
                                    A centralized learning platform designed to support your UAPL certification journey through interactive quizzes, flashcards, course materials, and progress tracking.
                                </p>

                                <div className="mt-8 flex items-center gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur-xl">
                                    <ShieldCheck size={24} />
                                    <p className="text-sm font-semibold text-blue-50">
                                        Learn. Practice. Certify.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-blue-100">
                                <span>Version 1.0 • Designed by: Jairus</span>

                                <button
                                    type="button"
                                    onClick={openDisclaimer}
                                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/20"
                                >
                                    <FileText size={14} />
                                    Disclaimer
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="p-6 sm:p-10">
                        <div className="mb-8">
                            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                                Apollo Global Academy
                            </p>

                            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                                Sign In
                            </h2>

                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                Enter your assigned account to continue.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Username
                                </span>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                                    <User size={18} className="text-slate-400" />
                                    <input
                                        value={username}
                                        onChange={(event) => setUsername(event.target.value)}
                                        autoComplete="off"
                                        className="w-full bg-transparent text-sm outline-none dark:text-white"
                                        placeholder="Enter username"
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Password
                                </span>

                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                                    <Lock size={18} className="text-slate-400" />
                                    <input
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        type="password"
                                        autoComplete="new-password"
                                        className="w-full bg-transparent text-sm outline-none dark:text-white"
                                        placeholder="Enter password"
                                    />
                                </div>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Plane size={18} />}
                                {loading ? "Signing In..." : "Sign In"}
                            </button>
                        </form>

                        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 sm:flex-row">
                            <span>Version 1.0 • Designed by: Jairus</span>

                            <button
                                type="button"
                                onClick={openDisclaimer}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-800"
                            >
                                <FileText size={14} />
                                Disclaimer
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
