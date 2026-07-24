import { useEffect, useMemo, useState } from "react";
import {
    BookOpenCheck,
    CheckCircle2,
    CirclePlay,
    Clock3,
    ExternalLink,
    FileText,
    GraduationCap,
    Layers3,
    Loader2,
    Lock,
    PlayCircle,
    RefreshCw,
    Sparkles
} from "lucide-react";
import {
    getCourseLessons,
    getLessonProgress,
    saveLessonProgress,
    syncFromCloud
} from "../lib/storage";
import { TRAINING_CATEGORIES, normalizeCategory } from "../lib/categoryAnalysis";
import { getVideoEmbedUrl, getVideoOpenUrl } from "../lib/video";
import PremiumDialog from "../components/PremiumDialog";

const MODULE_COLORS = {
    "General UAS Knowledge": "from-sky-500 to-blue-600",
    "Principles of Flight": "from-indigo-500 to-violet-600",
    "Air Law": "from-rose-500 to-red-600",
    "Navigation and Meteorology": "from-cyan-500 to-teal-600",
    "Human Factors": "from-amber-500 to-orange-600",
    "Safety and Operations": "from-emerald-500 to-green-600"
};

function isCompleted(progress, lessonId) {
    return progress.some(item =>
        String(item.lessonId) === String(lessonId) &&
        String(item.status || "").toLowerCase() === "completed"
    );
}

function getModuleProgress(lessons, progress, module) {
    const moduleLessons = lessons.filter(lesson => normalizeCategory(lesson.module) === module);
    const completed = moduleLessons.filter(lesson => isCompleted(progress, lesson.id)).length;

    return {
        total: moduleLessons.length,
        completed,
        percentage: moduleLessons.length
            ? Math.round((completed / moduleLessons.length) * 100)
            : 0
    };
}

function EmptyLearningState() {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-10 text-center shadow-premium backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <GraduationCap className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                Learning modules are being prepared
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Once your administrator adds Google Drive videos in Learning Manager, lessons will appear here automatically.
            </p>
        </div>
    );
}

export default function Learning({ session }) {
    const [lessons, setLessons] = useState(() =>
        getCourseLessons().filter(lesson => String(lesson.status || "Active") !== "Inactive")
    );
    const [progress, setProgress] = useState(getLessonProgress());
    const [selectedId, setSelectedId] = useState("");
    const [activeModule, setActiveModule] = useState("All");
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        if (!selectedId && lessons.length) {
            setSelectedId(lessons[0].id);
        }
    }, [lessons, selectedId]);

    const selectedLesson = useMemo(() => {
        return lessons.find(lesson => String(lesson.id) === String(selectedId)) || lessons[0] || null;
    }, [lessons, selectedId]);

    const filteredLessons = useMemo(() => {
        if (activeModule === "All") return lessons;
        return lessons.filter(lesson => normalizeCategory(lesson.module) === activeModule);
    }, [lessons, activeModule]);

    const completedCount = useMemo(() => {
        return lessons.filter(lesson => isCompleted(progress, lesson.id)).length;
    }, [lessons, progress]);

    const totalProgress = lessons.length
        ? Math.round((completedCount / lessons.length) * 100)
        : 0;

    const nextLesson = lessons.find(lesson => !isCompleted(progress, lesson.id)) || lessons[0] || null;

    function closeDialog() {
        setDialog(null);
    }

    async function refreshLearning() {
        setSyncing(true);

        try {
            await syncFromCloud();

            const nextLessons = getCourseLessons()
                .filter(lesson => String(lesson.status || "Active") !== "Inactive");

            setLessons(nextLessons);
            setProgress(getLessonProgress());

            if (nextLessons.length && !nextLessons.some(lesson => lesson.id === selectedId)) {
                setSelectedId(nextLessons[0].id);
            }
        } catch (error) {
            setDialog({
                type: "warning",
                title: "Sync Not Completed",
                message: error.message || "Unable to refresh learning content right now.",
                confirmText: "Done",
                onConfirm: closeDialog
            });
        } finally {
            setSyncing(false);
        }
    }

    async function markCompleted(lesson) {
        if (!lesson || isCompleted(progress, lesson.id)) return;

        setSaving(true);

        const localRow = {
            id: `local-progress-${Date.now()}`,
            userId: session?.id || "",
            username: session?.username || "",
            lessonId: lesson.id,
            status: "Completed",
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setProgress(previous => [...previous, localRow]);

        try {
            await saveLessonProgress({
                lessonId: lesson.id,
                status: "Completed",
                completedAt: localRow.completedAt
            });

            setProgress(getLessonProgress());

            setDialog({
                type: "success",
                title: "Lesson Completed",
                message: `"${lesson.title}" has been added to your learning progress.`,
                confirmText: "Continue",
                onConfirm: closeDialog
            });
        } catch (error) {
            setProgress(previous => previous.filter(item => item.id !== localRow.id));

            setDialog({
                type: "danger",
                title: "Progress Not Saved",
                message: error.message || "Unable to save this lesson progress.",
                confirmText: "Try Again",
                onConfirm: closeDialog
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
                <div className="bg-gradient-to-br from-sky-700 via-blue-800 to-slate-950 p-6 text-white sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide backdrop-blur">
                                <Sparkles className="h-4 w-4" />
                                E-Learning Academy
                            </div>

                            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                                UAPL Learning Pathway
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-sky-100">
                                Watch training videos, complete lessons, and track your course progress across the six UAPL modules.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={refreshLearning}
                            disabled={syncing}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-blue-800 shadow-xl transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {syncing ? "Syncing..." : "Refresh Lessons"}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-sm font-black text-slate-500 dark:text-slate-400">
                            Course Progress
                        </p>
                        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                            {totalProgress}%
                        </h2>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                                style={{ width: `${totalProgress}%` }}
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-sm font-black text-slate-500 dark:text-slate-400">
                            Completed Lessons
                        </p>
                        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                            {completedCount}/{lessons.length}
                        </h2>
                        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Your progress is saved to the training database.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-sm font-black text-slate-500 dark:text-slate-400">
                            Suggested Next
                        </p>
                        <h2 className="mt-2 line-clamp-2 text-lg font-black text-slate-950 dark:text-white">
                            {nextLesson?.title || "No lesson available"}
                        </h2>
                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {nextLesson ? normalizeCategory(nextLesson.module) : "Ask your administrator to add lessons."}
                        </p>
                    </div>
                </div>
            </section>

            {!lessons.length ? (
                <EmptyLearningState />
            ) : (
                <>
                    <section className="rounded-3xl border border-white/60 bg-white/85 p-4 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75 sm:p-5">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {["All", ...TRAINING_CATEGORIES].map(module => {
                                const active = activeModule === module;
                                const moduleProgress = module === "All"
                                    ? { completed: completedCount, total: lessons.length, percentage: totalProgress }
                                    : getModuleProgress(lessons, progress, module);

                                return (
                                    <button
                                        key={module}
                                        type="button"
                                        onClick={() => setActiveModule(module)}
                                        className={`min-w-max rounded-2xl border px-4 py-3 text-left text-xs font-black transition ${
                                            active
                                                ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <span className="block">{module}</span>
                                        <span className={`mt-1 block ${active ? "text-blue-100" : "text-slate-400"}`}>
                                            {moduleProgress.completed}/{moduleProgress.total} completed
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                        <section className="order-2 rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75 lg:order-1">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                    <Layers3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-950 dark:text-white">
                                        Course Curriculum
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        {filteredLessons.length} lessons shown
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {filteredLessons.map((lesson, index) => {
                                    const completed = isCompleted(progress, lesson.id);
                                    const active = selectedLesson?.id === lesson.id;
                                    const module = normalizeCategory(lesson.module);

                                    return (
                                        <button
                                            key={lesson.id}
                                            type="button"
                                            onClick={() => setSelectedId(lesson.id)}
                                            className={`w-full rounded-3xl border p-4 text-left transition ${
                                                active
                                                    ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-600/10 dark:border-sky-500 dark:bg-sky-500/10"
                                                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${
                                                    completed
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                }`}>
                                                    {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-2 font-black text-slate-950 dark:text-white">
                                                        {lesson.title}
                                                    </p>
                                                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {module}
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        {lesson.duration && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                <Clock3 className="h-3.5 w-3.5" />
                                                                {lesson.duration}
                                                            </span>
                                                        )}

                                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                                            completed
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                        }`}>
                                                            {completed ? "Completed" : "Pending"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="order-1 overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75 lg:order-2">
                            {selectedLesson ? (
                                <>
                                    <div className="aspect-video w-full bg-slate-950">
                                        {selectedLesson.videoUrl ? (
                                            <iframe
                                                src={getVideoEmbedUrl(selectedLesson.videoUrl)}
                                                title={selectedLesson.title}
                                                allow="autoplay; encrypted-media; picture-in-picture"
                                                allowFullScreen
                                                className="h-full w-full"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-8 text-center text-slate-300">
                                                <div>
                                                    <Lock className="mx-auto h-10 w-10" />
                                                    <p className="mt-3 text-sm font-bold">
                                                        No video link has been added for this lesson yet.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 sm:p-6">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                            <div>
                                                <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-black text-white ${MODULE_COLORS[normalizeCategory(selectedLesson.module)] || "from-slate-500 to-slate-600"}`}>
                                                    {normalizeCategory(selectedLesson.module)}
                                                </div>

                                                <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
                                                    {selectedLesson.title}
                                                </h2>

                                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                                                    {selectedLesson.description || "No lesson description has been added yet."}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                                                {selectedLesson.videoUrl && (
                                                    <a
                                                        href={getVideoOpenUrl(selectedLesson.videoUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                        Open Video
                                                    </a>
                                                )}

                                                {selectedLesson.materialUrl && (
                                                    <a
                                                        href={selectedLesson.materialUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        Materials
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                                                {isCompleted(progress, selectedLesson.id) ? (
                                                    <>
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                                        This lesson is completed
                                                    </>
                                                ) : (
                                                    <>
                                                        <CirclePlay className="h-5 w-5 text-sky-600" />
                                                        Watch the lesson, then mark it complete
                                                    </>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => markCompleted(selectedLesson)}
                                                disabled={saving || isCompleted(progress, selectedLesson.id)}
                                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-emerald-600"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
                                                {isCompleted(progress, selectedLesson.id)
                                                    ? "Completed"
                                                    : saving
                                                        ? "Saving..."
                                                        : "Mark as Completed"}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex min-h-[520px] items-center justify-center p-8 text-center text-slate-500">
                                    <div>
                                        <PlayCircle className="mx-auto h-12 w-12 text-sky-600" />
                                        <p className="mt-4 text-sm font-bold">
                                            Select a lesson to begin.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}
