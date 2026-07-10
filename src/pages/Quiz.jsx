import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Eye,
    Layers,
    RotateCcw,
    Shuffle,
    Target,
    Timer,
    Trophy,
    XCircle
} from "lucide-react";
import { getQuestions, submitQuizResult } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";
import {
    buildCategoryBreakdown,
    getStrongAndWeakCategories
} from "../lib/categoryAnalysis";

function shuffleArray(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

export default function Quiz({ session }) {
    const questionBank = useMemo(() => getQuestions(), []);
    const [mode, setMode] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [reviewMistakesOnly, setReviewMistakesOnly] = useState(false);
    const [dialog, setDialog] = useState(null);

    const autoNextTimer = useRef(null);
    const resultSaved = useRef(false);

    const current = questions[currentIndex];
    const total = questions.length;
    const isPractice = mode === "practice";
    const isMock = mode === "mock";

    const score = useMemo(() => {
        return answers.reduce((count, answer, index) => {
            return answer === questions[index]?.answer ? count + 1 : count;
        }, 0);
    }, [answers, questions]);

    const answeredCount = answers.filter((answer) => answer !== null).length;
    const liveAccuracy = answeredCount ? Math.round((score / answeredCount) * 100) : 0;
    const finalAccuracy = total ? Math.round((score / total) * 100) : 0;
    const progress = total ? Math.round((answeredCount / total) * 100) : 0;

    useEffect(() => {
        return () => clearTimeout(autoNextTimer.current);
    }, []);

    function clearAutoNext() {
        clearTimeout(autoNextTimer.current);
        autoNextTimer.current = null;
    }

    function startQuiz(nextMode) {
        clearAutoNext();

        const preparedQuestions =
            nextMode === "mock" ? shuffleArray(questionBank) : [...questionBank];

        setMode(nextMode);
        setQuestions(preparedQuestions);
        setCurrentIndex(0);
        setAnswers(Array(preparedQuestions.length).fill(null));
        setSelected(null);
        setSubmitted(false);
        setFinished(false);
        setShowReview(false);
        setReviewMistakesOnly(false);
        resultSaved.current = false;
    }

    function submitPracticeAnswer() {
        if (selected === null) {
            setDialog({
                type: "warning",
                title: "No Answer Selected",
                message: "Please select an option before submitting your answer.",
                confirmText: "Choose Answer",
                onConfirm: () => setDialog(null)
            });
            return;
        }

        const nextAnswers = [...answers];
        nextAnswers[currentIndex] = selected;
        setAnswers(nextAnswers);
        setSubmitted(true);

        clearAutoNext();

        autoNextTimer.current = setTimeout(() => {
            moveNextOrFinish(nextAnswers);
        }, 5000);
    }

    function saveMockAnswer(nextIndex) {
        const nextAnswers = [...answers];
        nextAnswers[currentIndex] = selected;
        setAnswers(nextAnswers);

        if (typeof nextIndex === "number") {
            setCurrentIndex(nextIndex);
            setSelected(nextAnswers[nextIndex]);
        }

        return nextAnswers;
    }

    function nextMockQuestion() {
        if (selected === null) {
            setDialog({
                type: "warning",
                title: "No Answer Selected",
                message: "Please select an answer before moving to the next question.",
                confirmText: "Continue",
                onConfirm: () => setDialog(null)
            });
            return;
        }

        const nextAnswers = saveMockAnswer(
            currentIndex < total - 1 ? currentIndex + 1 : currentIndex
        );

        if (currentIndex === total - 1) {
            finishQuiz(nextAnswers);
        }
    }

    function previousMockQuestion() {
        const nextAnswers = [...answers];
        if (selected !== null) nextAnswers[currentIndex] = selected;

        setAnswers(nextAnswers);

        const previousIndex = Math.max(currentIndex - 1, 0);
        setCurrentIndex(previousIndex);
        setSelected(nextAnswers[previousIndex]);
    }

    function moveNextOrFinish(nextAnswers = answers) {
        clearAutoNext();

        if (currentIndex < total - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setSelected(nextAnswers[nextIndex]);
            setSubmitted(nextAnswers[nextIndex] !== null && isPractice);
        } else {
            finishQuiz(nextAnswers);
        }
    }

    function finishQuiz(finalAnswers = answers) {
        clearAutoNext();

        const finalScore = finalAnswers.reduce((count, answer, index) => {
            return answer === questions[index]?.answer ? count + 1 : count;
        }, 0);

        const finalPercent = questions.length
            ? Math.round((finalScore / questions.length) * 100)
            : 0;

        if (!resultSaved.current) {
            submitQuizResult({
                userId: session?.id || "",
                username: session?.username || "",
                score: finalScore,
                total: questions.length,
                accuracy: finalPercent,
                mode: mode || "",
                submittedAt: new Date().toISOString()
            });

            resultSaved.current = true;
        }

        setAnswers(finalAnswers);
        setFinished(true);
        setSubmitted(false);
    }

    function goToQuestion(index) {
        clearAutoNext();

        if (isMock) {
            const nextAnswers = [...answers];
            if (selected !== null) nextAnswers[currentIndex] = selected;
            setAnswers(nextAnswers);
            setSelected(nextAnswers[index]);
        } else {
            setSelected(answers[index]);
            setSubmitted(answers[index] !== null);
        }

        setCurrentIndex(index);
        setShowReview(false);
    }

    function restartQuiz() {
        startQuiz(mode);
    }

    function backToModeSelect() {
        clearAutoNext();
        setMode(null);
        setQuestions([]);
        setCurrentIndex(0);
        setAnswers([]);
        setSelected(null);
        setSubmitted(false);
        setFinished(false);
        setShowReview(false);
        setReviewMistakesOnly(false);
        resultSaved.current = false;
    }

    if (!questionBank.length) {
        return (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-8 text-center shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <AlertCircle className="mx-auto text-amber-500" size={42} />
                <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
                    No Questions Found
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Add questions in Quiz Manager or sync your question bank.
                </p>
            </div>
        );
    }

    if (!mode) {
        return (
            <div className="space-y-6">
                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                        Quiz Mode
                    </p>
                    <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                        Choose Your Training Mode
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Practice Mode gives instant feedback. Mock Exam Mode randomizes the questions
                        and hides answers until the end.
                    </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <button
                        onClick={() => startQuiz("practice")}
                        className="group rounded-3xl border border-white/60 bg-white/90 p-6 text-left shadow-premium transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/80"
                    >
                        <div className="mb-5 inline-flex rounded-2xl bg-blue-600 p-4 text-white">
                            <Target size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                            Practice Mode
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Answer one question at a time. The system shows the correct answer,
                            explanation, and automatically moves to the next question after 5 seconds.
                        </p>
                        <div className="mt-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 dark:bg-sky-500/10 dark:text-sky-200">
                            Instant feedback enabled
                        </div>
                    </button>

                    <button
                        onClick={() => startQuiz("mock")}
                        className="group rounded-3xl border border-white/60 bg-white/90 p-6 text-left shadow-premium transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/80"
                    >
                        <div className="mb-5 inline-flex rounded-2xl bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
                            <Shuffle size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                            Mock Exam Mode
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Questions are randomized. Answers and explanations are hidden until
                            the quiz is completed, just like an exam-style attempt.
                        </p>
                        <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            Randomized questions enabled
                        </div>
                    </button>
                </div>
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
        return (
            <div className="rounded-3xl border border-white/60 bg-white/85 p-8 text-center shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <ClipboardCheck className="mx-auto text-blue-600 dark:text-sky-300" size={52} />

                <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
                    Quiz Completed
                </h1>

                <p className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {isMock ? "Mock Exam Mode" : "Practice Mode"}
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <ResultCard label="Score" value={`${score}/${total}`} tone="blue" />
                    <ResultCard label="Accuracy" value={`${finalAccuracy}%`} tone="emerald" />
                    <ResultCard label="Mistakes" value={total - score} tone="amber" />
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-4">
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
                        Retake
                    </button>

                    <button
                        onClick={backToModeSelect}
                        className="rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700 dark:border-slate-700 dark:text-white"
                    >
                        Change Mode
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                            {isMock ? "Mock Exam Mode" : "Practice Mode"}
                        </p>
                        <h1 className="text-2xl font-black text-slate-950 dark:text-white">
                            Question {currentIndex + 1} of {total}
                        </h1>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                        <Stat label="Score" value={isMock ? "Hidden" : score} />
                        <Stat label="Accuracy" value={isMock ? "Hidden" : `${liveAccuracy}%`} />
                        <Stat label="Done" value={`${answeredCount}/${total}`} />
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

                    {isMock && (
                        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                            <Eye size={18} />
                            Answers and explanations are hidden until you complete the mock exam.
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        {current.options.map((option, index) => {
                            const isCorrect = index === current.answer;
                            const isSelected = selected === index;

                            let style =
                                "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800";

                            if (isPractice && submitted && isCorrect) {
                                style =
                                    "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-100";
                            } else if (isPractice && submitted && isSelected && !isCorrect) {
                                style =
                                    "border-red-400 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-500/10 dark:text-red-100";
                            } else if (isSelected) {
                                style =
                                    "border-blue-500 bg-blue-50 text-blue-900 dark:border-sky-400 dark:bg-sky-500/10 dark:text-sky-100";
                            }

                            return (
                                <button
                                    key={index}
                                    disabled={isPractice && submitted}
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

                    {isPractice && submitted && (
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

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                        {isPractice ? (
                            !submitted ? (
                                <button
                                    onClick={submitPracticeAnswer}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 md:col-span-2"
                                >
                                    <Target size={18} />
                                    Submit Answer
                                </button>
                            ) : (
                                <button
                                    onClick={() => moveNextOrFinish()}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 md:col-span-2"
                                >
                                    {currentIndex === total - 1 ? "Finish Quiz" : "Next Question"}
                                    <ChevronRight size={18} />
                                </button>
                            )
                        ) : (
                            <>
                                <button
                                    onClick={previousMockQuestion}
                                    disabled={currentIndex === 0}
                                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-white"
                                >
                                    <ChevronLeft size={18} />
                                    Previous
                                </button>

                                <button
                                    onClick={nextMockQuestion}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                >
                                    {currentIndex === total - 1 ? "Submit Exam" : "Next"}
                                    <ChevronRight size={18} />
                                </button>
                            </>
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

                            if (answer !== null && isPractice && isCorrect) {
                                style = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
                            } else if (answer !== null && isPractice && !isCorrect) {
                                style = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
                            } else if (answer !== null && isMock) {
                                style = "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200";
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

                    <button
                        onClick={backToModeSelect}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-white"
                    >
                        <Layers size={16} />
                        Change Mode
                    </button>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</p>
            <p className="font-black text-slate-950 dark:text-white">{value}</p>
        </div>
    );
}

function ResultCard({ label, value, tone }) {
    const colors = {
        blue: "bg-blue-50 text-blue-900 dark:bg-sky-500/10 dark:text-white",
        emerald: "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-white",
        amber: "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-white"
    };

    return (
        <div className={`rounded-3xl p-5 ${colors[tone]}`}>
            <p className="text-sm font-bold opacity-80">{label}</p>
            <p className="mt-1 text-3xl font-black">{value}</p>
        </div>
    );
}
