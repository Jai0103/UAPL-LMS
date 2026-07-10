import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    Loader2,
    RotateCcw,
    Shuffle,
    Target,
    Timer,
    XCircle
} from "lucide-react";
import { getQuestions, submitQuizResult } from "../lib/storage";
import {
    buildCategoryBreakdown,
    getStrongAndWeakCategories,
    normalizeCategory
} from "../lib/categoryAnalysis";

function shuffleArray(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

function normalizeQuestions(items) {
    return (items || []).map(item => ({
        ...item,
        category: normalizeCategory(item.category),
        answer: Number(item.answer),
        options: item.options || [
            item.optionA || "",
            item.optionB || "",
            item.optionC || "",
            item.optionD || ""
        ]
    }));
}

function PremiumDialog({ dialog, onClose }) {
    if (!dialog) return null;

    const isWarning = dialog.type === "warning";
    const Icon = isWarning ? AlertTriangle : CheckCircle2;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isWarning
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}>
                        <Icon className="h-6 w-6" />
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

export default function Quiz({ session }) {
    const [sourceQuestions, setSourceQuestions] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [mode, setMode] = useState("practice");
    const [started, setStarted] = useState(false);
    const [loading, setLoading] = useState(true);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [userAnswers, setUserAnswers] = useState([]);
    const [feedback, setFeedback] = useState(null);

    const [result, setResult] = useState(null);
    const [showReview, setShowReview] = useState(false);
    const [savingResult, setSavingResult] = useState(false);
    const [dialog, setDialog] = useState(null);

    const autoNextRef = useRef(null);

    useEffect(() => {
        async function loadQuestions() {
            try {
                const data = await Promise.resolve(getQuestions());
                setSourceQuestions(normalizeQuestions(data));
            } finally {
                setLoading(false);
            }
        }

        loadQuestions();

        return () => {
            if (autoNextRef.current) clearTimeout(autoNextRef.current);
        };
    }, []);

    const currentQuestion = questions[currentIndex];

    const progress = useMemo(() => {
        if (!questions.length) return 0;
        return Math.round(((currentIndex + 1) / questions.length) * 100);
    }, [currentIndex, questions.length]);

    function startQuiz(nextMode) {
        const preparedQuestions =
            nextMode === "mock"
                ? shuffleArray(sourceQuestions)
                : [...sourceQuestions];

        setMode(nextMode);
        setQuestions(preparedQuestions);
        setStarted(true);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setUserAnswers(Array(preparedQuestions.length).fill(null));
        setFeedback(null);
        setResult(null);
        setShowReview(false);
    }

    function submitAnswer() {
        if (selectedAnswer === null) {
            setDialog({
                type: "warning",
                title: "Select an answer",
                message: "Please choose one option before submitting your answer."
            });
            return;
        }

        const nextAnswers = [...userAnswers];
        nextAnswers[currentIndex] = selectedAnswer;
        setUserAnswers(nextAnswers);

        const isCorrect = selectedAnswer === currentQuestion.answer;

        if (mode === "practice") {
            setFeedback({
                isCorrect,
                selectedAnswer,
                correctAnswer: currentQuestion.answer,
                explanation: currentQuestion.explanation
            });

            if (autoNextRef.current) clearTimeout(autoNextRef.current);

            autoNextRef.current = setTimeout(() => {
                if (currentIndex < questions.length - 1) {
                    goNext(nextAnswers);
                } else {
                    finishQuiz(nextAnswers);
                }
            }, 5000);

            return;
        }

        if (currentIndex < questions.length - 1) {
            goNext(nextAnswers);
        } else {
            finishQuiz(nextAnswers);
        }
    }

    function goNext(answers = userAnswers) {
        if (autoNextRef.current) clearTimeout(autoNextRef.current);

        if (currentIndex >= questions.length - 1) {
            finishQuiz(answers);
            return;
        }

        const nextIndex = currentIndex + 1;

        setCurrentIndex(nextIndex);
        setSelectedAnswer(answers[nextIndex]);
        setFeedback(null);
    }

    async function finishQuiz(finalAnswers) {
        if (autoNextRef.current) clearTimeout(autoNextRef.current);

        const total = questions.length;
        const score = finalAnswers.reduce((count, answer, index) => {
            return answer === questions[index].answer ? count + 1 : count;
        }, 0);

        const accuracy = total ? Math.round((score / total) * 100) : 0;
        const categoryBreakdown = buildCategoryBreakdown(questions, finalAnswers);
        const { strongest, weakest } = getStrongAndWeakCategories(categoryBreakdown);

        const finalResult = {
            score,
            total,
            accuracy,
            categoryBreakdown,
            strongest,
            weakest,
            answers: finalAnswers
        };

        setResult(finalResult);
        setStarted(false);
        setFeedback(null);
        setSavingResult(true);

        try {
            await Promise.resolve(
                submitQuizResult({
                    userId: session?.id || "",
                    username: session?.username || "guest",
                    score,
                    total,
                    accuracy,
                    categoryBreakdown
                })
            );
        } catch (error) {
            console.error("Quiz result save failed:", error);
        } finally {
            setSavingResult(false);
        }
    }

    function retakeQuiz() {
        startQuiz(mode);
    }

    const reviewItems = useMemo(() => {
        if (!result) return [];

        return questions
            .map((question, index) => ({
                question,
                index,
                userAnswer: result.answers[index],
                isCorrect: result.answers[index] === question.answer
            }))
            .filter(item => !item.isCorrect);
    }, [questions, result]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                    <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Preparing quiz questions...
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

    if (result) {
        return (
            <div className="space-y-6">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                                Quiz Completed
                            </p>
                            <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                                {result.score} / {result.total} ({result.accuracy}%)
                            </h1>
                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {savingResult ? "Saving result..." : "Your quiz result has been recorded."}
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

                <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">
                        Module Performance
                    </h3>

                    <div className="mt-4 grid gap-3">
                        {result.categoryBreakdown.map(item => (
                            <div
                                key={item.category}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-black text-slate-900 dark:text-white">
                                        {item.category}
                                    </p>

                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                        {item.accuracy}%
                                    </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                                        style={{ width: `${item.accuracy}%` }}
                                    />
                                </div>

                                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {item.correct} correct out of {item.total}
                                </p>
                            </div>
                        ))}
                    </div>

                    {result.weakest && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            Suggested focus: <strong>{result.weakest.category}</strong>
                        </div>
                    )}
                </div>

                {showReview && (
                    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                        <h2 className="text-xl font-black text-slate-950 dark:text-white">
                            Mistake Review
                        </h2>

                        <div className="mt-4 space-y-4">
                            {reviewItems.length ? (
                                reviewItems.map(item => (
                                    <div
                                        key={item.index}
                                        className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30"
                                    >
                                        <p className="text-sm font-black text-slate-950 dark:text-white">
                                            Q{item.index + 1}: {item.question.question}
                                        </p>

                                        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                                            Your answer: {item.question.options[item.userAnswer] || "Not answered"}
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
                                    No mistakes. Excellent work.
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
            <div className="space-y-6">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                        UAPL Quiz
                    </p>
                    <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                        Choose Quiz Mode
                    </h1>
                    <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        Practice Mode shows answers immediately. Mock Exam Mode randomizes questions and hides answers until the end.
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
                            See correct answers and explanations after every question.
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
                            Randomized questions. Answers are shown only after completion.
                        </p>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <PremiumDialog dialog={dialog} onClose={() => setDialog(null)} />

            <div className="space-y-6">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-black text-sky-600 dark:text-sky-300">
                                Question {currentIndex + 1} of {questions.length}
                            </p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {mode === "mock" ? "Mock Exam Mode" : "Practice Mode"} • {currentQuestion.category}
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <Timer className="h-4 w-4" />
                            {progress}% Complete
                        </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <h1 className="text-xl font-black leading-8 text-slate-950 dark:text-white">
                        Q{currentIndex + 1}: {currentQuestion.question}
                    </h1>

                    <div className="mt-6 grid gap-3">
                        {currentQuestion.options.map((option, index) => {
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
                                    {String.fromCharCode(65 + index)}. {option}
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
                                            Correct answer: {currentQuestion.options[currentQuestion.answer]}
                                        </p>
                                    )}

                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                        {feedback.explanation}
                                    </p>

                                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                        Moving to the next question automatically in 5 seconds.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={feedback ? () => goNext() : submitAnswer}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-sky-700"
                        >
                            {currentIndex === questions.length - 1 && !feedback
                                ? "Finish Quiz"
                                : feedback
                                    ? "Next Question"
                                    : "Submit Answer"}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
