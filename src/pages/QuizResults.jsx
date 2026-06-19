import { useMemo, useState } from "react";
import {
    BarChart3,
    ClipboardCheck,
    Download,
    Eye,
    Search,
    TrendingUp,
    Trophy,
    Users,
    X
} from "lucide-react";
import { getQuizResults, getUsers } from "../lib/storage";

function toNumber(value) {
    if (value === null || value === undefined) return 0;
    return Number(String(value).replace("%", "")) || 0;
}

function formatDate(value) {
    if (!value) return "No record";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No record";

    return date.toLocaleString("en-SG", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function downloadCsv(filename, rows) {
    const csv = rows.map(row =>
        row.map(cell => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export default function QuizResults() {
    const [users] = useState(() => getUsers());
    const [results] = useState(() => getQuizResults());
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedStudent, setSelectedStudent] = useState(null);

    const studentUsers = useMemo(() => {
        return users.filter(user => String(user.role).toLowerCase() === "student");
    }, [users]);

    const studentProgress = useMemo(() => {
        return studentUsers.map(user => {
            const attempts = results
                .filter(result =>
                    result.userId === user.id ||
                    String(result.username).toLowerCase() === String(user.username).toLowerCase()
                )
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            const accuracies = attempts.map(item => toNumber(item.accuracy));
            const bestAccuracy = accuracies.length ? Math.max(...accuracies) : 0;
            const averageAccuracy = accuracies.length
                ? Math.round(accuracies.reduce((sum, item) => sum + item, 0) / accuracies.length)
                : 0;

            const latestAttempt = attempts[0];

            return {
                ...user,
                attempts,
                attemptCount: attempts.length,
                bestAccuracy,
                averageAccuracy,
                latestScore: latestAttempt ? `${latestAttempt.score}/${latestAttempt.total}` : "No attempt",
                latestAccuracy: latestAttempt ? toNumber(latestAttempt.accuracy) : 0,
                lastAttempt: latestAttempt?.submittedAt || ""
            };
        });
    }, [studentUsers, results]);

    const filteredStudents = useMemo(() => {
        return studentProgress.filter(student => {
            const keyword = search.toLowerCase();
            const matchesSearch =
                student.name?.toLowerCase().includes(keyword) ||
                student.username?.toLowerCase().includes(keyword) ||
                student.email?.toLowerCase().includes(keyword);

            const matchesStatus =
                statusFilter === "All" ||
                String(student.status).toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [studentProgress, search, statusFilter]);

    const dashboardStats = useMemo(() => {
        const totalAttempts = results.length;
        const attemptedStudents = studentProgress.filter(student => student.attemptCount > 0).length;
        const allAccuracies = results.map(result => toNumber(result.accuracy));
        const averageAccuracy = allAccuracies.length
            ? Math.round(allAccuracies.reduce((sum, item) => sum + item, 0) / allAccuracies.length)
            : 0;
        const bestAccuracy = allAccuracies.length ? Math.max(...allAccuracies) : 0;

        return {
            totalAttempts,
            attemptedStudents,
            averageAccuracy,
            bestAccuracy
        };
    }, [results, studentProgress]);

    function exportResults() {
        const rows = [
            ["Student", "Username", "Attempts", "Best Accuracy", "Average Accuracy", "Latest Score", "Last Attempt"],
            ...studentProgress.map(student => [
                student.name,
                student.username,
                student.attemptCount,
                `${student.bestAccuracy}%`,
                `${student.averageAccuracy}%`,
                student.latestScore,
                formatDate(student.lastAttempt)
            ])
        ];

        downloadCsv("uapl-student-quiz-results.csv", rows);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                        Admin Analytics
                    </p>
                    <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
                        Quiz Result Dashboard
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                        Monitor each student’s quiz attempts, scores, accuracy, and learning progress.
                    </p>
                </div>

                <button
                    onClick={exportResults}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                >
                    <Download size={18} />
                    Export CSV
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={ClipboardCheck} label="Total Attempts" value={dashboardStats.totalAttempts} />
                <StatCard icon={Users} label="Students Attempted" value={dashboardStats.attemptedStudents} />
                <StatCard icon={TrendingUp} label="Average Accuracy" value={`${dashboardStats.averageAccuracy}%`} />
                <StatCard icon={Trophy} label="Best Accuracy" value={`${dashboardStats.bestAccuracy}%`} />
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                            Student Progress
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            View performance by student.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search student..."
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-sky-950 sm:w-72"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={event => setStatusFilter(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option>All</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[920px] border-separate border-spacing-y-2 text-left text-sm">
                        <thead>
                            <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                <th className="px-4 py-2">Student</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Attempts</th>
                                <th className="px-4 py-2">Latest Score</th>
                                <th className="px-4 py-2">Best</th>
                                <th className="px-4 py-2">Average</th>
                                <th className="px-4 py-2">Progress</th>
                                <th className="px-4 py-2">Last Attempt</th>
                                <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredStudents.map(student => (
                                <tr
                                    key={student.id}
                                    className="rounded-2xl bg-slate-50/90 text-slate-700 shadow-sm dark:bg-slate-950/70 dark:text-slate-200"
                                >
                                    <td className="rounded-l-2xl px-4 py-4">
                                        <div className="font-bold text-slate-950 dark:text-white">
                                            {student.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            @{student.username} {student.email ? `• ${student.email}` : ""}
                                        </div>
                                    </td>

                                    <td className="px-4 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                            String(student.status).toLowerCase() === "active"
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                        }`}>
                                            {student.status}
                                        </span>
                                    </td>

                                    <td className="px-4 py-4 font-bold">{student.attemptCount}</td>
                                    <td className="px-4 py-4">{student.latestScore}</td>
                                    <td className="px-4 py-4 font-bold text-emerald-600">{student.bestAccuracy}%</td>
                                    <td className="px-4 py-4 font-bold text-sky-600">{student.averageAccuracy}%</td>

                                    <td className="px-4 py-4">
                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                                                style={{ width: `${Math.min(student.averageAccuracy, 100)}%` }}
                                            />
                                        </div>
                                    </td>

                                    <td className="px-4 py-4 text-xs text-slate-500">
                                        {formatDate(student.lastAttempt)}
                                    </td>

                                    <td className="rounded-r-2xl px-4 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
                                        >
                                            <Eye size={15} />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {!filteredStudents.length && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                            No student records found.
                        </div>
                    )}
                </div>
            </div>

            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                                    {selectedStudent.name}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    @{selectedStudent.username} • {selectedStudent.attemptCount} attempt(s)
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-5">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <MiniStat label="Best Accuracy" value={`${selectedStudent.bestAccuracy}%`} />
                                <MiniStat label="Average Accuracy" value={`${selectedStudent.averageAccuracy}%`} />
                                <MiniStat label="Latest Score" value={selectedStudent.latestScore} />
                            </div>

                            <div className="mt-5 space-y-3">
                                {selectedStudent.attempts.map((attempt, index) => (
                                    <div
                                        key={attempt.id || index}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="font-bold text-slate-950 dark:text-white">
                                                    Attempt #{selectedStudent.attempts.length - index}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(attempt.submittedAt)}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                                    Score: {attempt.score}/{attempt.total}
                                                </span>
                                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                    Accuracy: {toNumber(attempt.accuracy)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!selectedStudent.attempts.length && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                                        This student has not submitted any quiz attempt yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
                </div>
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
        </div>
    );
}
