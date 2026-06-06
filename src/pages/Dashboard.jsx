import { useMemo, useState } from "react";
import {
    BookOpen,
    ClipboardList,
    Eye,
    Layers,
    Search,
    ShieldCheck,
    Trophy,
    Users
} from "lucide-react";
import {
    getCourseNotes,
    getFlashcards,
    getQuestions,
    getQuizResults,
    getUsers
} from "../lib/storage";

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-SG", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

export default function Dashboard({ session }) {
    const [showUsers, setShowUsers] = useState(false);
    const [search, setSearch] = useState("");

    const users = getUsers();
    const questions = getQuestions();
    const flashcards = getFlashcards();
    const notes = getCourseNotes();
    const quizResults = getQuizResults();

    const isAdmin = session?.role === "admin";

    const studentResults = useMemo(() => {
        return quizResults.filter((result) => {
            return (
                String(result.userId || "") === String(session?.id || "") ||
                String(result.username || "").toLowerCase() ===
                    String(session?.username || "").toLowerCase()
            );
        });
    }, [quizResults, session]);

    const latestResult = studentResults[studentResults.length - 1];

    const bestAccuracy = studentResults.length
        ? Math.max(...studentResults.map((result) => Number(result.accuracy || 0)))
        : 0;

    const averageAccuracy = studentResults.length
        ? Math.round(
              studentResults.reduce(
                  (total, result) => total + Number(result.accuracy || 0),
                  0
              ) / studentResults.length
          )
        : 0;

    const suggestedAction = !studentResults.length
        ? "Start your first quiz from the navigation menu."
        : Number(latestResult?.accuracy || 0) >= 80
            ? "Keep your knowledge fresh with flashcard review."
            : "Retake the quiz and review your weak areas.";

    const filteredUsers = useMemo(() => {
        const keyword = search.toLowerCase();

        return users.filter((user) =>
            `${user.name} ${user.username} ${user.role} ${user.status}`
                .toLowerCase()
                .includes(keyword)
        );
    }, [users, search]);

    const studentCards = [
        {
            label: "Questions",
            value: questions.length,
            icon: ClipboardList,
            color: "bg-blue-600"
        },
        {
            label: "Flashcards",
            value: flashcards.length,
            icon: Layers,
            color: "bg-cyan-600"
        }
    ];

    const adminCards = [
        ...studentCards,
        {
            label: "Course Notes",
            value: notes.length,
            icon: BookOpen,
            color: "bg-emerald-600"
        },
        {
            label: "Users",
            value: users.length,
            icon: Users,
            color: "bg-indigo-600"
        }
    ];

    const cards = isAdmin ? adminCards : studentCards;

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                            Apollo Global Academy
                        </p>

                        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                            Welcome, {session?.name || "User"}
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {isAdmin
                                ? "Monitor the LMS content, users, notes, and training resources."
                                : suggestedAction}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Powered by Github Repositories • Developed by Jairus
                        </p>
                    </div>

                    <div className="rounded-3xl bg-blue-600 px-5 py-4 text-white shadow-lg shadow-blue-600/25">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={28} />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
                                    Access Level
                                </p>
                                <p className="text-lg font-black capitalize">
                                    {session?.role || "student"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {!isAdmin && (
                <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                            <Trophy size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-950 dark:text-white">
                                My Progress
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Your quiz performance and account access summary.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <ProgressCard
                            label="Last Quiz Score"
                            value={
                                latestResult
                                    ? `${latestResult.score}/${latestResult.total}`
                                    : "No attempt"
                            }
                        />

                        <ProgressCard
                            label="Best Accuracy"
                            value={studentResults.length ? `${bestAccuracy}%` : "No attempt"}
                        />

                        <ProgressCard
                            label="Average Accuracy"
                            value={studentResults.length ? `${averageAccuracy}%` : "No attempt"}
                        />

                        <ProgressCard
                            label="Total Attempts"
                            value={studentResults.length}
                        />

                        <ProgressCard
                            label="Last Login"
                            value={formatDate(session?.lastLogin)}
                        />

                        <ProgressCard
                            label="Access Expiry"
                            value={
                                session?.expiryDate
                                    ? formatDate(session.expiryDate)
                                    : "No expiry"
                            }
                        />

                        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-5 text-white sm:col-span-2">
                            <p className="text-sm font-bold text-blue-100">
                                Suggested Next Action
                            </p>
                            <p className="mt-2 text-xl font-black">
                                {suggestedAction}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className={`grid gap-5 ${isAdmin ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}>
                {cards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.label}
                            className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75"
                        >
                            <div className="flex items-center justify-between">
                                <div className={`rounded-2xl ${card.color} p-3 text-white`}>
                                    <Icon size={22} />
                                </div>

                                {card.label === "Users" && isAdmin && (
                                    <button
                                        onClick={() => setShowUsers(true)}
                                        className="rounded-xl bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                        aria-label="View users"
                                    >
                                        <Eye size={18} />
                                    </button>
                                )}
                            </div>

                            <p className="mt-5 text-sm font-bold text-slate-500 dark:text-slate-400">
                                {card.label}
                            </p>
                            <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                                {card.value}
                            </p>
                        </div>
                    );
                })}
            </section>

            {isAdmin && (
                <section className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Training Overview
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Use Quiz Mode for assessment practice and Flashcards for quick
                            recall. Admin users can manage questions, users, course notes,
                            imports, and backups.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Google Sheets Backend
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Your LMS is connected to Google Sheets for shared user access,
                            course notes, quiz content, flashcards, and quiz results.
                        </p>
                    </div>
                </section>
            )}

            {showUsers && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-950 dark:text-white">
                                        Users
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {users.length} registered users
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowUsers(false)}
                                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                                <Search size={18} className="text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search users..."
                                    className="w-full bg-transparent text-sm outline-none dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="max-h-[56vh] overflow-y-auto p-5">
                            <div className="space-y-3">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                                    >
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="font-black text-slate-950 dark:text-white">
                                                    {user.name}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {user.username} • {user.role} • {user.status || "Active"}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700 dark:bg-sky-500/10 dark:text-sky-200">
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {filteredUsers.length === 0 && (
                                    <p className="py-8 text-center text-sm text-slate-500">
                                        No users found.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProgressCard({ label, value }) {
    return (
        <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-950/60">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {value}
            </p>
        </div>
    );
}
