import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    RotateCcw,
    Target,
    X,
    XCircle
} from "lucide-react";
import { getQuestions, submitQuizResult } from "../lib/storage";

function PremiumPopup({ title, message, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/50 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                {title}
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {message}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                    Select Answer
                </button>
            </div>
        </div>
    );
}

export default function Quiz({ session }) {
    const [questions] = useState(getQuestions());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState(Array(getQuestions().length).fill(null));
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [reviewMistakesOnly, setReviewMistakesOnly] = useState(false);
    const [popup, setPopup] = useState(null);

    const autoNextTimer = useRef(null);

    const current = questions[currentIndex];
    const total = questions.length;

    const score = useMemo(() => {
        return answers.reduce((count, answer, index) => {
            return answer === questions[index]?.answer ? count + 1 : count;
        }, 0);
    }, [answers, questions]);

    const answeredCount = answers.filter((answer) => answer !== null).length;
    const liveAccuracy = answeredCount ? Math.round((score / answeredCount) * 100) : 0;
    const progress = total ? Math.round((answeredCount / total) * 100) : 0;

    useEffect(() => {
        return () => clearTimeout(autoNextTimer.current);
    }, []);

    function clearAutoNext() {
        clearTimeout(autoNextTimer.current);
        autoNextTimer.current = null;
    }

    function submitAnswer() {
        if (selected === null) {
            setPopup({
                title: "No Answer Selected",
                message: "Please choose one option before submitting your answer."
            });
            return;
        }

        const nextAnswers = [...answers];
        nextAnswers[currentIndex] = selected;
        setAnswers(nextAnswers);
        setSubmitted(true);

        clearAutoNext();

        autoNextTimer.current = setTimeout(() => {
            moveNextOrFinish();
        }, 5000);
    }

    function moveNextOrFinish() {
        clearAutoNext();

        if (currentIndex < total - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setSelected(answers[nextIndex]);
            setSubmitted(answers[nextIndex] !== null);
        } else {
            setFinished(true);
            setSubmitted(false);
        }
    }

    function goToQuestion(index) {
        clearAutoNext();
        setCurrentIndex(index);
        setSelected(answers[index]);
        setSubmitted(answers[index] !== null);
        setShowReview(false);
        setFinished(false);
    }

    function restartQuiz() {
        clearAutoNext();
        window.quizResultSaved = false;
        setCurrentIndex(0);
        setAnswers(Array(total).fill(null));
        setSelected(null);
        setSubmitted(false);
        setFinished(false);
        setShowReview(false);
        setReviewMistakesOnly(false);
    }

    if (!questions.length) {
        return (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-8 text-center shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <AlertCircle className="mx-auto text-amber-500" size={42} />
                <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
                    No Questions Found
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Add questions in Quiz Manager or reset your local data.
                </p>
            </div>
        );
    }

    const selectedIsCorrect = selected === current?.answer;

    const reviewItems = questions
        .map((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.answer;

            if (reviewMistakesOnly && isCorrect) return null;

            return { question, index, userAnswer, isCorrect };
        })
        .filter(Boolean);

    if (showReview) {
        return (
            <div className="space-y-6">
                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                                Review
                            </p>
                            <h1 className="text-2xl font-black text-slate-950 dark:text-white">
                                {reviewMistakesOnly ? "Review Mistakes" : "Review All Questions"}
                            </h1>
                        </div>

                        <button
                            onClick={() => setShowReview(false)}
                            className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white"
                        >
                            Back to Result
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {reviewItems.map(({ question, index, userAnswer, isCorrect }) => (
                        <div
                            key={index}
                            className={`rounded-3xl border p-5 shadow-premium backdrop-blur-xl ${
                                isCorrect
                                    ? "border-emerald-200 bg-emerald-50/90 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                    : "border-red-200 bg-red-50/90 dark:border-red-500/20 dark:bg-red-500/10"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {isCorrect ? (
                                    <CheckCircle2 className="mt-1 text-emerald-600" size={22} />
                                ) : (
                                    <XCircle className="mt-1 text-red-600" size={22} />
                                )}

                                <div>
                                    <h2 className="font-black text-slate-950 dark:text-white">
                                        Q{index + 1}: {question.question}
                                    </h2>

                                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                                        <strong>Your answer:</strong>{" "}
                                        {userAnswer === null ? "Not answered" : question.options[userAnswer]}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                        <strong>Correct answer:</strong>{" "}
                                        {question.options[question.answer]}
                                    </p>

                                    <p className="mt-3 rounded-2xl bg-white/70 p-4 text-sm text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                                        {question.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!reviewItems.length && (
                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-700">
                            No mistakes to review. Excellent work.
                        </div>
                    )}
                </div>
            </div>
        );
    }

if (finished) {
    const finalAccuracy = Math.round((score / total) * 100);

    if (!window.quizResultSaved) {
        submitQuizResult({
            userId: session?.id || "",
            username: session?.username || "",
            score,
            total,
            accuracy: finalAccuracy,
            submittedAt: new Date().toISOString()
        });

        window.quizResultSaved = true;
    }

        return (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-8 text-center shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <ClipboardCheck className="mx-auto text-blue-600 dark:text-sky-300" size={52} />

                <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
                    Quiz Completed
                </h1>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl bg-blue-50 p-5 dark:bg-sky-500/10">
                        <p className="text-sm font-bold text-blue-700 dark:text-sky-200">Score</p>
                        <p className="mt-1 text-3xl font-black text-blue-900 dark:text-white">
                            {score}/{total}
                        </p>
                    </div>

                    <div className="rounded-3xl bg-emerald-50 p-5 dark:bg-emerald-500/10">
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-200">Accuracy</p>
                        <p className="mt-1 text-3xl font-black text-emerald-900 dark:text-white">
                            {finalAccuracy}%
                        </p>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-5 dark:bg-amber-500/10">
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-200">Mistakes</p>
                        <p className="mt-1 text-3xl font-black text-amber-900 dark:text-white">
                            {total - score}
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-3">
                    <button
                        onClick={() => {
                            setReviewMistakesOnly(true);
                            setShowReview(true);
                        }}
                        className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white"
                    >
                        Review Mistakes
                    </button>

                    <button
                        onClick={() => {
                            setReviewMistakesOnly(false);
                            setShowReview(true);
                        }}
                        className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white"
                    >
                        Review All
                    </button>

                    <button
                        onClick={restartQuiz}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950"
                    >
                        <RotateCcw size={18} />
                        Retake Quiz
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {popup && (
                <PremiumPopup
                    title={popup.title}
                    message={popup.message}
                    onClose={() => setPopup(null)}
                />
            )}

            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                            Quiz Mode
                        </p>
                        <h1 className="text-2xl font-black text-slate-950 dark:text-white">
                            Question {currentIndex + 1} of {total}
                        </h1>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl bg-blue-50 px-4 py-3 dark:bg-sky-500/10">
                            <p className="text-xs font-bold text-blue-700 dark:text-sky-200">Score</p>
                            <p className="font-black text-slate-950 dark:text-white">{score}</p>
                        </div>

                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-200">Accuracy</p>
                            <p className="font-black text-slate-950 dark:text-white">{liveAccuracy}%</p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Done</p>
                            <p className="font-black text-slate-950 dark:text-white">
                                {answeredCount}/{total}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
                <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
                    <h2 className="text-xl font-black leading-8 text-slate-950 dark:text-white">
                        {current.question}
                    </h2>

                    <div className="mt-6 space-y-3">
                        {current.options.map((option, index) => {
                            const isCorrect = index === current.answer;
                            const isSelected = selected === index;

                            let style =
                                "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800";

                            if (submitted && isCorrect) {
                                style =
                                    "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-100";
                            } else if (submitted && isSelected && !isCorrect) {
                                style =
                                    "border-red-400 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-500/10 dark:text-red-100";
                            } else if (isSelected) {
                                style =
                                    "border-blue-500 bg-blue-50 text-blue-900 dark:border-sky-400 dark:bg-sky-500/10 dark:text-sky-100";
                            }

                            return (
                                <button
                                    key={index}
                                    disabled={submitted}
                                    onClick={() => setSelected(index)}
                                    className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${style}`}
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span className="font-semibold">{option}</span>
                                </button>
                            );
                        })}
                    </div>

                    {submitted && (
                        <div
                            className={`mt-6 rounded-3xl border p-5 ${
                                selectedIsCorrect
                                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                    : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {selectedIsCorrect ? (
                                    <CheckCircle2 className="text-emerald-600" size={22} />
                                ) : (
                                    <XCircle className="text-red-600" size={22} />
                                )}

                                <h3 className="font-black text-slate-950 dark:text-white">
                                    {selectedIsCorrect ? "Correct Answer" : "Incorrect Answer"}
                                </h3>
                            </div>

                            {!selectedIsCorrect && (
                                <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                                    <strong>Correct answer:</strong>{" "}
                                    {current.options[current.answer]}
                                </p>
                            )}

                            <p className="mt-3 rounded-2xl bg-white/70 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                                {current.explanation}
                            </p>

                            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                Auto moving to next question in 5 seconds.
                            </p>
                        </div>
                    )}

                    <div className="mt-6">
                        {!submitted ? (
                            <button
                                onClick={submitAnswer}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                            >
                                <Target size={18} />
                                Submit Answer
                            </button>
                        ) : (
                            <button
                                onClick={moveNextOrFinish}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                            >
                                {currentIndex === total - 1 ? "Finish Quiz" : "Next Question"}
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                    <h3 className="font-black text-slate-950 dark:text-white">
                        Question Navigator
                    </h3>

                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {questions.map((_, index) => {
                            const answer = answers[index];
                            const isActive = index === currentIndex;
                            const isCorrect = answer === questions[index].answer;

                            let style = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

                            if (answer !== null && isCorrect) {
                                style = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
                            } else if (answer !== null && !isCorrect) {
                                style = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
                            }

                            if (isActive) {
                                style = "bg-blue-600 text-white";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => goToQuestion(index)}
                                    className={`rounded-xl px-2 py-2 text-xs font-black ${style}`}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
