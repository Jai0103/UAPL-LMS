import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    Award,
    BarChart3,
    BookOpen,
    CheckCircle2,
    ClipboardCheck,
    Loader2,
    Lock,
    PlayCircle,
    RotateCcw,
    Shuffle,
    Target,
    XCircle
} from "lucide-react";
import { getQuestions, submitQuizResult } from "../lib/storage";
import {
    TRAINING_CATEGORIES,
    normalizeCategory
} from "../lib/categoryAnalysis";

const PASSING_RATE = 75;
const QUIZ_PROGRESS_VERSION = 2;

function getProgressKey(session) {
    return `uapl_module_quiz_progress_v2_${session?.id || session?.username || "guest"}`;
}

function readSavedProgress(session) {
    try {
        const saved = localStorage.getItem(getProgressKey(session));
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        if (parsed.version !== QUIZ_PROGRESS_VERSION) return null;
        if (!parsed.started) return null;

        return parsed;
    } catch {
        return null;
    }
}

function clearSavedProgress(session) {
    localStorage.removeItem(getProgressKey(session));
}

function shuffleArray(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

function normalizeQuestions(items) {
    return (items || []).map((item, index) => ({
        ...item,
        id: item.id || `question-${index + 1}`,
        category: normalizeCategory(item.category),
        question: item.question || "",
        options: item.options || [
            item.optionA || "",
            item.optionB || "",
            item.optionC || "",
            item.optionD || ""
        ],
        answer: Number(item.answer || 0),
        explanation: item.explanation || ""
    }));
}

function buildModules(questions, mode) {
    return TRAINING_CATEGORIES.map(category => {
        let moduleQuestions = questions.filter(
            question => normalizeCategory(question.category) === category
        );

        if (mode === "mock") {
            moduleQuestions = shuffleArray(moduleQuestions);
        }

        return {
            category,
            questions: moduleQuestions
        };
    });
}

function buildModulesFromProgress(questions, progress) {
    const questionById = new Map(
        questions.map(question => [String(question.id), question])
    );

    return TRAINING_CATEGORIES.map(category => {
        const savedIds = progress.moduleQuestionIds?.[category] || [];

        const orderedQuestions = savedIds
            .map(id => questionById.get(String(id)))
            .filter(question => question && normalizeCategory(question.category) === category);

        const orderedIds = new Set(orderedQuestions.map(question => String(question.id)));

        const newQuestions = questions.filter(question => {
            return normalizeCategory(question.category) === category &&
                !orderedIds.has(String(question.id));
        });

        return {
            category,
            questions: [...orderedQuestions, ...newQuestions]
        };
    });
}

function getModuleQuestionIds(modules) {
    const map = {};

    modules.forEach(module => {
        map[module.category] = module.questions.map(question => question.id);
    });

    return map;
}

function getAnswerLabel(index) {
    return ["A", "B", "C", "D"][Number(index)] || "";
}

function calculateModuleSummary(module, answersById) {
    const total = module.questions.length;

    const correct = module.questions.reduce((count, question) => {
        return answersById[question.id] === question.answer ? count + 1 : count;
    }, 0);

    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    return {
        category: module.category,
        correct,
        total,
        accuracy,
        passed: total ? accuracy >= PASSING_RATE : true,
        needsFocus: total ? accuracy < PASSING_RATE : false
    };
}

function calculateFinalResult(modules, answersById) {
    const categoryBreakdown = modules.map(module =>
        calculateModuleSummary(module, answersById)
    );

    const total = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);
    const score = categoryBreakdown.reduce((sum, item) => sum + item.correct, 0);
    const accuracy = total ? Math.round((score / total) * 100) : 0;

    const focusModules = categoryBreakdown.filter(item => item.needsFocus);
    const passedModules = categoryBreakdown.filter(
        item => item.total > 0 && item.passed
    );

    return {
        score,
        total,
        accuracy,
        categoryBreakdown,
        focusModules,
        passedModules,
        answersById
    };
}

function formatSavedAt(value) {
    if (!value) return "recently";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "recently";

    return date.toLocaleString("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function PremiumDialog({ dialog, onClose }) {
    if (!dialog) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <AlertTriangle className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            {dialog.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {dialog.message}
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

function ResumeAttemptDialog({ progress, onResume, onStartFresh }) {
    if (!progress) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <PlayCircle className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Resume incomplete quiz?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            We found an unfinished quiz attempt saved on this device.
                            You can continue from where you stopped.
                        </p>

                        <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            Last saved: {formatSavedAt(progress.savedAt)}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={onStartFresh}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Start Fresh
                    </button>

                    <button
                        type="button"
                        onClick={onResume}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg transition hover:bg-sky-700"
                    >
                        Resume Quiz
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MobileModuleProgress({ modules, activeIndex, completedModules, activeQuestionIndex }) {
    const activeModule = modules[activeIndex];
    const activeTotal = activeModule?.questions?.length || 0;
    const activeProgress = activeTotal
        ? Math.round(((activeQuestionIndex + 1) / activeTotal) * 100)
        : 100;

    return (
        <div className="md:hidden">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                        Module {activeIndex + 1} of {modules.length}
                    </p>

                    <h2 className="mt-1 break-words text-base font-black text-slate-950 dark:text-white">
                        {activeModule?.category}
                    </h2>

                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Question {activeTotal ? activeQuestionIndex + 1 : 0} of {activeTotal}
                    </p>
                </div>

                <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    {activeProgress}%
                </span>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
                {modules.map((module, index) => {
                    const completed = completedModules.includes(module.category);
                    const active = index === activeIndex;
                    const locked = index > activeIndex && !completed;

                    return (
                        <div key={module.category} className="flex flex-col items-center gap-1">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black transition ${
                                    completed
                                        ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : active
                                            ? "border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-600/25"
                                            : locked
                                                ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                                                : "border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                                }`}
                                title={module.category}
                            >
                                {completed ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : locked ? (
                                    <Lock className="h-3.5 w-3.5" />
                                ) : (
                                    index + 1
                                )}
                            </div>

                            <span className={`h-1.5 w-full rounded-full ${
                                completed
                                    ? "bg-emerald-400"
                                    : active
                                        ? "bg-sky-500"
                                        : "bg-slate-200 dark:bg-slate-800"
                            }`} />
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                    style={{ width: `${activeProgress}%` }}
                />
            </div>
        </div>
    );
}

function ModuleStepper({ modules, activeIndex, completedModules, activeQuestionIndex }) {
    return (
        <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:p-5">
            <MobileModuleProgress
                modules={modules}
                activeIndex={activeIndex}
                completedModules={completedModules}
                activeQuestionIndex={activeQuestionIndex}
            />

            <div className="hidden md:block">
                <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                    Module Progress
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module, index) => {
                        const completed = completedModules.includes(module.category);
                        const active = index === activeIndex;
                        const locked = index > activeIndex && !completed;

                        return (
                            <div
                                key={module.category}
                                className={`rounded-2xl border p-4 transition ${
                                    active
                                        ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
                                        : completed
                                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                                            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Module {index + 1}
                                        </p>

                                        <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                                            {module.category}
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {module.questions.length} questions
                                        </p>
                                    </div>

                                    <div className="shrink-0">
                                        {completed ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        ) : locked ? (
                                            <Lock className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <PlayCircle className="h-5 w-5 text-sky-600" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ModuleResultCard({ summary, onNextModule }) {
    const hasQuestions = summary.total > 0;

    return (
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 text-center shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
                    !hasQuestions
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : summary.passed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
            >
                {summary.passed ? (
                    <CheckCircle2 className="h-8 w-8" />
                ) : (
                    <AlertTriangle className="h-8 w-8" />
                )}
            </div>

            <p className="mt-5 text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                Module Completed
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {summary.category}
            </h1>

            {hasQuestions ? (
                <>
                    <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">
                        {summary.accuracy}%
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {summary.correct} correct out of {summary.total}. Passing rate is {PASSING_RATE}%.
                    </p>

                    <div
                        className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
                            summary.passed
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                        }`}
                    >
                        {summary.passed
                            ? "Good work. You passed this module."
                            : "This module needs more focus. Continue the quiz, then review it in your final report."}
                    </div>
                </>
            ) : (
                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No questions are currently assigned to this module.
                </p>
            )}

            <button
                type="button"
                onClick={onNextModule}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-sky-700"
            >
                Continue to Next Module
                <ArrowRight className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function Quiz({ session }) {
    const [sourceQuestions, setSourceQuestions] = useState([]);
    const [modules, setModules] = useState([]);
    const [mode, setMode] = useState("");
    const [loading, setLoading] = useState(true);
    const [started, setStarted] = useState(false);
    const [savedProgress, setSavedProgress] = useState(null);

    const [activeModuleIndex, setActiveModuleIndex] = useState(0);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [answersById, setAnswersById] = useState({});
    const [completedModules, setCompletedModules] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [moduleSummary, setModuleSummary] = useState(null);

    const [finalResult, setFinalResult] = useState(null);
    const [showReview, setShowReview] = useState(false);
    const [reviewFilter, setReviewFilter] = useState("All");
    const [savingResult, setSavingResult] = useState(false);
    const [dialog, setDialog] = useState(null);

    const autoNextRef = useRef(null);

    useEffect(() => {
        async function loadQuestions() {
            try {
                const data = await Promise.resolve(getQuestions());
                const normalized = normalizeQuestions(data);

                setSourceQuestions(normalized);
                setSavedProgress(readSavedProgress(session));
            } finally {
                setLoading(false);
            }
        }

        loadQuestions();

        return () => {
            if (autoNextRef.current) clearTimeout(autoNextRef.current);
        };
    }, [session]);

    useEffect(() => {
        if (!started || !modules.length || finalResult) return;

        const snapshot = {
            version: QUIZ_PROGRESS_VERSION,
            started: true,
            mode,
            activeModuleIndex,
            activeQuestionIndex,
            selectedAnswer,
            answersById,
            completedModules,
            showModuleSummary: !!moduleSummary,
            moduleQuestionIds: getModuleQuestionIds(modules),
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(getProgressKey(session), JSON.stringify(snapshot));
        setSavedProgress(snapshot);
    }, [
        started,
        modules,
        mode,
        activeModuleIndex,
        activeQuestionIndex,
        selectedAnswer,
        answersById,
        completedModules,
        moduleSummary,
        finalResult,
        session
    ]);

    useEffect(() => {
        if (!started || finalResult) return;

        function handleBeforeUnload(event) {
            event.preventDefault();
            event.returnValue = "";
        }

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [started, finalResult]);

    const activeModule = modules[activeModuleIndex];
    const activeQuestion = activeModule?.questions?.[activeQuestionIndex];

    const reviewItems = useMemo(() => {
        if (!finalResult) return [];

        return modules
            .flatMap(module =>
                module.questions.map(question => ({
                    module: module.category,
                    question,
                    selectedAnswer: finalResult.answersById[question.id],
                    isCorrect: finalResult.answersById[question.id] === question.answer
                }))
            )
            .filter(item => !item.isCorrect);
    }, [finalResult, modules]);

    const reviewCounts = useMemo(() => {
        const counts = { All: reviewItems.length };

        TRAINING_CATEGORIES.forEach(category => {
            counts[category] = reviewItems.filter(item => item.module === category).length;
        });

        return counts;
    }, [reviewItems]);

    const filteredReviewItems = useMemo(() => {
        if (reviewFilter === "All") return reviewItems;
        return reviewItems.filter(item => item.module === reviewFilter);
    }, [reviewItems, reviewFilter]);

    function clearAutoNext() {
        if (autoNextRef.current) {
            clearTimeout(autoNextRef.current);
            autoNextRef.current = null;
        }
    }

    function startQuiz(nextMode) {
        const nextModules = buildModules(sourceQuestions, nextMode);

        clearSavedProgress(session);
        setSavedProgress(null);

        setModules(nextModules);
        setMode(nextMode);
        setStarted(true);
        setActiveModuleIndex(0);
        setActiveQuestionIndex(0);
        setSelectedAnswer(null);
        setAnswersById({});
        setCompletedModules([]);
        setFeedback(null);
        setModuleSummary(null);
        setFinalResult(null);
        setShowReview(false);
        setReviewFilter("All");
    }

    function resumeSavedAttempt() {
        if (!savedProgress) return;

        const restoredModules = buildModulesFromProgress(sourceQuestions, savedProgress);
        const safeModuleIndex = Math.min(
            Math.max(Number(savedProgress.activeModuleIndex || 0), 0),
            restoredModules.length - 1
        );

        const restoredModule = restoredModules[safeModuleIndex];
        const maxQuestionIndex = Math.max((restoredModule?.questions?.length || 1) - 1, 0);
        const safeQuestionIndex = Math.min(
            Math.max(Number(savedProgress.activeQuestionIndex || 0), 0),
            maxQuestionIndex
        );

        const restoredAnswers = savedProgress.answersById || {};
        const restoredQuestion = restoredModule?.questions?.[safeQuestionIndex];

        setModules(restoredModules);
        setMode(savedProgress.mode || "practice");
        setStarted(true);
        setActiveModuleIndex(safeModuleIndex);
        setActiveQuestionIndex(safeQuestionIndex);
        setAnswersById(restoredAnswers);
        setCompletedModules(savedProgress.completedModules || []);
        setSelectedAnswer(
            savedProgress.selectedAnswer !== undefined && savedProgress.selectedAnswer !== null
                ? savedProgress.selectedAnswer
                : restoredQuestion
                    ? restoredAnswers[restoredQuestion.id] ?? null
                    : null
        );
        setFeedback(null);
        setFinalResult(null);
        setShowReview(false);
        setReviewFilter("All");

        if (savedProgress.showModuleSummary && restoredModule) {
            setModuleSummary(calculateModuleSummary(restoredModule, restoredAnswers));
        } else {
            setModuleSummary(null);
        }
    }

    function discardSavedAttempt() {
        clearSavedProgress(session);
        setSavedProgress(null);
    }

    function submitAnswer() {
        if (!activeQuestion) return;

        if (selectedAnswer === null) {
            setDialog({
                title: "Select an answer",
                message: "Please choose one option before submitting your answer."
            });
            return;
        }

        const nextAnswers = {
            ...answersById,
            [activeQuestion.id]: selectedAnswer
        };

        setAnswersById(nextAnswers);

        const isCorrect = selectedAnswer === activeQuestion.answer;

        if (mode === "practice") {
            setFeedback({
                isCorrect,
                selectedAnswer,
                correctAnswer: activeQuestion.answer,
                explanation: activeQuestion.explanation
            });

            clearAutoNext();

            autoNextRef.current = setTimeout(() => {
                goNext(nextAnswers);
            }, 5000);

            return;
        }

        goNext(nextAnswers);
    }

    function goNext(nextAnswers = answersById) {
        clearAutoNext();

        if (!activeModule) return;

        if (activeQuestionIndex < activeModule.questions.length - 1) {
            const nextQuestionIndex = activeQuestionIndex + 1;
            const nextQuestion = activeModule.questions[nextQuestionIndex];

            setActiveQuestionIndex(nextQuestionIndex);
            setSelectedAnswer(nextAnswers[nextQuestion.id] ?? null);
            setFeedback(null);
            return;
        }

        completeCurrentModule(nextAnswers);
    }

    function completeCurrentModule(nextAnswers = answersById) {
        if (!activeModule) return;

        const summary = calculateModuleSummary(activeModule, nextAnswers);

        const nextCompletedModules = Array.from(
            new Set([...completedModules, activeModule.category])
        );

        setCompletedModules(nextCompletedModules);
        setFeedback(null);
        setSelectedAnswer(null);

        if (activeModuleIndex >= modules.length - 1) {
            finishQuiz(nextAnswers);
            return;
        }

        setModuleSummary(summary);
    }

    function goToNextModule() {
        const nextModuleIndex = activeModuleIndex + 1;
        const nextModule = modules[nextModuleIndex];

        setActiveModuleIndex(nextModuleIndex);
        setActiveQuestionIndex(0);
        setSelectedAnswer(
            nextModule?.questions?.[0]
                ? answersById[nextModule.questions[0].id] ?? null
                : null
        );
        setFeedback(null);
        setModuleSummary(null);
    }

    async function finishQuiz(nextAnswers = answersById) {
        clearAutoNext();

        const result = calculateFinalResult(modules, nextAnswers);

        setFinalResult(result);
        setStarted(false);
        setModuleSummary(null);
        setReviewFilter("All");
        setSavingResult(true);

        clearSavedProgress(session);
        setSavedProgress(null);

        try {
            await Promise.resolve(
                submitQuizResult({
                    userId: session?.id || "",
                    username: session?.username || "guest",
                    score: result.score,
                    total: result.total,
                    accuracy: result.accuracy,
                    categoryBreakdown: result.categoryBreakdown
                })
            );
        } catch (error) {
            console.error("Quiz result save failed:", error);
        } finally {
            setSavingResult(false);
        }
    }

    function retakeQuiz() {
        startQuiz(mode || "practice");
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                    <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Preparing module quiz...
                    </p>
                </div>
            </div>
        );
    }

    if (!sourceQuestions.length) {
        return (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <h1 className="text-xl font-black">No questions available</h1>
                <p className="mt-2 text-sm font-semibold">
                    Please add questions from Quiz Manager or sync your Google Sheet.
                </p>
            </div>
        );
    }

    if (finalResult) {
        return (
            <div className="space-y-6">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                                Quiz Completed
                            </p>

                            <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                                {finalResult.score} / {finalResult.total} ({finalResult.accuracy}%)
                            </h1>

                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                Passing rate per module is {PASSING_RATE}%.
                                {savingResult ? " Saving result..." : " Your result has been recorded."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => setShowReview(value => !value)}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                            >
                                <ClipboardCheck className="h-4 w-4" />
                                {showReview ? "Hide Review" : "Review Mistakes"}
                            </button>

                            <button
                                type="button"
                                onClick={retakeQuiz}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg transition hover:bg-sky-700"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Retake Quiz
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                                Final Report
                            </p>
                            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                                Module Performance
                            </h2>
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4">
                        {finalResult.categoryBreakdown.map(item => (
                            <div
                                key={item.category}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white">
                                            {item.category}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {item.total
                                                ? `${item.correct} correct out of ${item.total}`
                                                : "No questions assigned"}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-black ${
                                            !item.total
                                                ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                : item.passed
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                        }`}
                                    >
                                        {!item.total
                                            ? "No questions"
                                            : item.passed
                                                ? `Passed ${item.accuracy}%`
                                                : `Focus ${item.accuracy}%`}
                                    </span>
                                </div>

                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                    <div
                                        className={`h-full rounded-full ${
                                            item.passed
                                                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                                                : "bg-gradient-to-r from-amber-500 to-orange-500"
                                        }`}
                                        style={{ width: `${item.total ? item.accuracy : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                        {finalResult.focusModules.length ? (
                            <>
                                <h3 className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
                                    <Target className="h-5 w-5 text-amber-600" />
                                    Modules to Focus
                                </h3>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {finalResult.focusModules.map(item => (
                                        <span
                                            key={item.category}
                                            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                        >
                                            {item.category} ({item.accuracy}%)
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
                                    <Award className="h-5 w-5 text-emerald-600" />
                                    Excellent Module Performance
                                </h3>

                                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    You reached the passing rate for all modules with assigned questions.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {showReview && (
                    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                                    Mistake Review
                                </h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    Filter your mistakes by module.
                                </p>
                            </div>

                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                {filteredReviewItems.length} shown
                            </span>
                        </div>

                        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                            {["All", ...TRAINING_CATEGORIES].map(category => {
                                const active = reviewFilter === category;
                                const count = reviewCounts[category] || 0;

                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setReviewFilter(category)}
                                        className={`shrink-0 rounded-2xl border px-4 py-2 text-xs font-black transition ${
                                            active
                                                ? "border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-600/20"
                                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                                        }`}
                                    >
                                        {category}
                                        <span className={`ml-2 rounded-full px-2 py-0.5 ${
                                            active
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 space-y-4">
                            {filteredReviewItems.length ? (
                                filteredReviewItems.map((item, index) => (
                                    <div
                                        key={`${item.question.id}-${index}`}
                                        className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30"
                                    >
                                        <p className="text-xs font-black uppercase tracking-wide text-rose-600 dark:text-rose-300">
                                            {item.module}
                                        </p>

                                        <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                                            {item.question.question}
                                        </p>

                                        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                                            Your answer: {item.question.options[item.selectedAnswer] || "Not answered"}
                                        </p>

                                        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                                            Correct answer: {item.question.options[item.question.answer]}
                                        </p>

                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                            {item.question.explanation}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    No mistakes in this filter.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (!started) {
        return (
            <>
                <ResumeAttemptDialog
                    progress={savedProgress}
                    onResume={resumeSavedAttempt}
                    onStartFresh={discardSavedAttempt}
                />

                <div className="space-y-6">
                    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                        <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                            UAPL Module Quiz
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                            Complete the 6 Modules in Order
                        </h1>

                        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                            Students must complete each module before moving to the next. Passing rate per module is {PASSING_RATE}%.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => startQuiz("practice")}
                            className="rounded-3xl border border-sky-200 bg-white/85 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/80"
                        >
                            <Target className="h-8 w-8 text-sky-600" />

                            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                                Practice Mode
                            </h2>

                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                Complete modules in order. Answers and explanations are shown after each question.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => startQuiz("mock")}
                            className="rounded-3xl border border-emerald-200 bg-white/85 p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/80"
                        >
                            <Shuffle className="h-8 w-8 text-emerald-600" />

                            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                                Mock Exam Mode
                            </h2>

                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                Complete modules in order. Questions are randomized and answers are shown at the end.
                            </p>
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (moduleSummary) {
        return (
            <div className="space-y-4 md:space-y-6">
                <ModuleStepper
                    modules={modules}
                    activeIndex={activeModuleIndex}
                    completedModules={completedModules}
                    activeQuestionIndex={activeQuestionIndex}
                />

                <ModuleResultCard
                    summary={moduleSummary}
                    onNextModule={goToNextModule}
                />
            </div>
        );
    }

    if (activeModule && !activeModule.questions.length) {
        return (
            <div className="space-y-4 md:space-y-6">
                <ModuleStepper
                    modules={modules}
                    activeIndex={activeModuleIndex}
                    completedModules={completedModules}
                    activeQuestionIndex={activeQuestionIndex}
                />

                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 text-center shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <BookOpen className="mx-auto h-10 w-10 text-slate-400" />

                    <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
                        {activeModule.category}
                    </h1>

                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        No questions are currently assigned to this module.
                    </p>

                    <button
                        type="button"
                        onClick={() => completeCurrentModule(answersById)}
                        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-sky-700"
                    >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <PremiumDialog dialog={dialog} onClose={() => setDialog(null)} />

            <div className="space-y-4 md:space-y-6">
                <ModuleStepper
                    modules={modules}
                    activeIndex={activeModuleIndex}
                    completedModules={completedModules}
                    activeQuestionIndex={activeQuestionIndex}
                />

                <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:p-6">
                    <div className="mb-4 hidden md:block">
                        <p className="text-sm font-black text-sky-600 dark:text-sky-300">
                            Module {activeModuleIndex + 1} of {modules.length}
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                            {activeModule.category}
                        </h2>

                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Question {activeQuestionIndex + 1} of {activeModule.questions.length} • {mode === "mock" ? "Mock Exam Mode" : "Practice Mode"}
                        </p>
                    </div>

                    <div className="mb-4 md:hidden">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {mode === "mock" ? "Mock Exam Mode" : "Practice Mode"}
                        </p>
                    </div>

                    <h1 className="text-lg font-black leading-7 text-slate-950 dark:text-white md:text-xl md:leading-8">
                        Q{activeQuestionIndex + 1}: {activeQuestion.question}
                    </h1>

                    <div className="mt-5 grid gap-3 md:mt-6">
                        {activeQuestion.options.map((option, index) => {
                            const selected = selectedAnswer === index;

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={!!feedback}
                                    onClick={() => setSelectedAnswer(index)}
                                    className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${
                                        selected
                                            ? "border-sky-500 bg-sky-50 text-sky-800 ring-4 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-950"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                                    }`}
                                >
                                    {getAnswerLabel(index)}. {option}
                                </button>
                            );
                        })}
                    </div>

                    {feedback && (
                        <div className={`mt-5 rounded-2xl border p-4 ${
                            feedback.isCorrect
                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                                : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
                        }`}>
                            <div className="flex items-start gap-3">
                                {feedback.isCorrect ? (
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                                ) : (
                                    <XCircle className="mt-0.5 h-5 w-5 text-rose-600" />
                                )}

                                <div>
                                    <p className="font-black text-slate-950 dark:text-white">
                                        {feedback.isCorrect ? "Correct answer" : "Incorrect answer"}
                                    </p>

                                    {!feedback.isCorrect && (
                                        <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Correct answer: {activeQuestion.options[activeQuestion.answer]}
                                        </p>
                                    )}

                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                        {feedback.explanation}
                                    </p>

                                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                        Moving automatically in 5 seconds.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={feedback ? () => goNext() : submitAnswer}
                            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 sm:w-auto"
                        >
                            {feedback
                                ? activeQuestionIndex === activeModule.questions.length - 1
                                    ? "Complete Module"
                                    : "Next Question"
                                : activeQuestionIndex === activeModule.questions.length - 1
                                    ? "Submit and Complete Module"
                                    : "Submit Answer"}

                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
