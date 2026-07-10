import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    Brain,
    CalendarClock,
    ClipboardCheck,
    FileText,
    Loader2,
    Target,
    TrendingUp,
    Users
} from "lucide-react";
import {
    getCourseNotes,
    getFlashcards,
    getQuestions,
    getQuizResults,
    getUsers
} from "../lib/storage";
import { TRAINING_CATEGORIES, normalizeCategory } from "../lib/categoryAnalysis";

const CATEGORY_COLORS = {
    "General UAS Knowledge": "from-sky-500 to-blue-600",
    "Principles of Flight": "from-indigo-500 to-violet-600",
    "Air Law": "from-rose-500 to-red-600",
    "Navigation and Meteorology": "from-cyan-500 to-teal-600",
    "Human Factors": "from-amber-500 to-orange-600",
    "Safety and Operations": "from-emerald-500 to-green-600"
};

function isAdmin(session) {
    return String(session?.role || "").toLowerCase() === "admin";
}

function formatDisplayDate(value) {
    if (!value) return "No expiry";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No expiry";

    return date.toLocaleDateString("en-SG", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function getRemainingDays(value) {
    if (!value) return "No expiry limit";

    const expiry = new Date(value);
    if (Number.isNaN(expiry.getTime())) return "No expiry limit";

    expiry.setHours(23, 59, 59, 999);

    const today = new Date();
    const diffMs = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days === 1) return "1 day remaining";

    return `${days} days remaining`;
}

function parseBreakdown(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function StatCard({ icon: Icon, label, value, detail, color }) {
    return (
        <div className="min-w-0 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-500 dark:text-slate-400">
                        {label}
                    </p>

                    <h2 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
                        {value}
                    </h2>

                    {detail && (
                        <p className="mt-2 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {detail}
                        </p>
                    )}
                </div>

                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${color}`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
            </div>
        </div>
    );
}

function CategoryDistributionCard({ questions }) {
    const categoryData = useMemo(() => {
        const counts = {};

        TRAINING_CATEGORIES.forEach(category => {
            counts[category] = 0;
        });

        questions.forEach(question => {
            const category = normalizeCategory(question.category);
            counts[category] += 1;
        });

        const maxCount = Math.max(...Object.values(counts), 1);

        return TRAINING_CATEGORIES.map(category => ({
            category,
            count: counts[category],
            percentage: Math.round((counts[category] / maxCount) * 100),
            color: CATEGORY_COLORS[category] || "from-slate-500 to-slate-600"
        }));
    }, [questions]);

    return (
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                        Question Bank
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                        Questions by Training Module
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {questions.length} total questions categorized across 6 modules
                    </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    <BarChart3 className="h-6 w-6" />
                </div>
            </div>

            <div className="mt-6 grid gap-4">
                {categoryData.map(item => (
                    <div key={item.category}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                {item.category}
                            </p>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {item.count}
                            </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LatestWeaknessCard({ latestAttempt }) {
    const breakdown = parseBreakdown(latestAttempt?.categoryBreakdown);
    const weakModules = breakdown.filter(item => Number(item.total || 0) > 0 && Number(item.accuracy || 0) < 75);

    if (!latestAttempt) {
        return (
            <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <Target className="h-6 w-6" />
                    </div>

                    <div>
                        <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                            Latest Module Focus
                        </p>
                        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                            No quiz attempt yet
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Complete a quiz to see which modules need more attention.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                        Latest Module Focus
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                        {weakModules.length ? "Review these modules next" : "All modules passed"}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Based on your latest quiz attempt. Module passing rate is 75%.
                    </p>
                </div>

                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    weakModules.length
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}>
                    {weakModules.length ? <AlertTriangle className="h-6 w-6" /> : <Target className="h-6 w-6" />}
                </div>
            </div>

            <div className="mt-5 grid gap-3">
                {(weakModules.length ? weakModules : breakdown).map(item => (
                    <div
                        key={item.category}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                                {item.category}
                            </p>

                            <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                Number(item.accuracy) >= 75
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}>
                                {item.accuracy}%
                            </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                                className={`h-full rounded-full ${
                                    Number(item.accuracy) >= 75
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500"
                                }`}
                                style={{ width: `${Number(item.accuracy || 0)}%` }}
                            />
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {item.correct} correct out of {item.total}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StudentProgress({ session, quizResults }) {
    const myResults = useMemo(() => {
        return quizResults.filter(result =>
            String(result.userId) === String(session?.id) ||
            String(result.username).toLowerCase() === String(session?.username).toLowerCase()
        );
    }, [quizResults, session]);

    const lastAttempt = myResults[myResults.length - 1];

    const bestScore = myResults.length
        ? Math.max(...myResults.map(result => Number(result.accuracy || 0)))
        : 0;

    const averageAccuracy = myResults.length
        ? Math.round(
              myResults.reduce((sum, result) => sum + Number(result.accuracy || 0), 0) /
                  myResults.length
          )
        : 0;

    const expiryDate = formatDisplayDate(session?.expiryDate);
    const expiryRemaining = getRemainingDays(session?.expiryDate);

    return (
        <>
            <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    My Progress
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                    Welcome back, {session?.name || session?.username}
                </h1>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={ClipboardCheck}
                        label="Last Quiz Score"
                        value={lastAttempt ? `${lastAttempt.score}/${lastAttempt.total}` : "None"}
                        detail={lastAttempt ? `${lastAttempt.accuracy}% accuracy` : "No attempt yet"}
                        color="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    />

                    <StatCard
                        icon={TrendingUp}
                        label="Best Accuracy"
                        value={`${bestScore}%`}
                        detail="Highest quiz performance"
                        color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    />

                    <StatCard
                        icon={BarChart3}
                        label="Average Accuracy"
                        value={`${averageAccuracy}%`}
                        detail={`${myResults.length} total attempts`}
                        color="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    />

                    <StatCard
                        icon={CalendarClock}
                        label="Access Expiry"
                        value={expiryDate}
                        detail={expiryRemaining}
                        color="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    />
                </div>
            </div>

            <LatestWeaknessCard latestAttempt={lastAttempt} />
        </>
    );
}

export default function Dashboard({ session }) {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [flashcards, setFlashcards] = useState([]);
    const [users, setUsers] = useState([]);
    const [courseNotes, setCourseNotes] = useState([]);
    const [quizResults, setQuizResults] = useState([]);

    useEffect(() => {
        async function loadDashboard() {
            try {
                const [
                    questionData,
                    flashcardData,
                    userData,
                    noteData,
                    resultData
                ] = await Promise.all([
                    Promise.resolve(getQuestions()),
                    Promise.resolve(getFlashcards()),
                    Promise.resolve(getUsers()),
                    Promise.resolve(getCourseNotes()),
                    Promise.resolve(getQuizResults())
                ]);

                setQuestions(questionData || []);
                setFlashcards(flashcardData || []);
                setUsers(userData || []);
                setCourseNotes(noteData || []);
                setQuizResults(resultData || []);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                    <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Preparing dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAdmin(session)) {
        return (
            <div className="space-y-6">
                <StudentProgress session={session} quizResults={quizResults} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        icon={BookOpen}
                        label="Available Questions"
                        value={questions.length}
                        detail="Quiz question bank"
                        color="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    />

                    <StatCard
                        icon={Brain}
                        label="Flashcards"
                        value={flashcards.length}
                        detail="Quick recall cards"
                        color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    />
                </div>
            </div>
        );
    }

    const activeUsers = users.filter(user => String(user.status).toLowerCase() === "active").length;
    const inactiveUsers = users.length - activeUsers;

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    Admin Dashboard
                </p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                    Apollo Global Academy LMS
                </h1>
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Live overview of users, quiz content, flashcards, notes, and student attempts.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    icon={Users}
                    label="Users"
                    value={users.length}
                    detail={`${activeUsers} active, ${inactiveUsers} inactive`}
                    color="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                />

                <StatCard
                    icon={BookOpen}
                    label="Questions"
                    value={questions.length}
                    detail="Assessment bank"
                    color="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                />

                <StatCard
                    icon={Brain}
                    label="Flashcards"
                    value={flashcards.length}
                    detail="Revision cards"
                    color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                />

                <StatCard
                    icon={FileText}
                    label="Course Notes"
                    value={courseNotes.length}
                    detail="Shared resources"
                    color="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                />

                <StatCard
                    icon={ClipboardCheck}
                    label="Quiz Attempts"
                    value={quizResults.length}
                    detail="Submitted results"
                    color="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                />
            </div>

            <CategoryDistributionCard questions={questions} />
        </div>
    );
}
