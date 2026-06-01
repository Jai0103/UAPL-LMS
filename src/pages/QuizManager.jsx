import { useState } from "react";
import { Edit3, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { getQuestions, resetQuestions, saveQuestions } from "../lib/storage";

const emptyForm = {
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "0",
    explanation: ""
};

export default function QuizManager() {
    const [questions, setQuestions] = useState(getQuestions());
    const [editingIndex, setEditingIndex] = useState(null);
    const [form, setForm] = useState(emptyForm);

    function fillForm(question, index) {
        setEditingIndex(index);
        setForm({
            question: question.question || "",
            optionA: question.options?.[0] || "",
            optionB: question.options?.[1] || "",
            optionC: question.options?.[2] || "",
            optionD: question.options?.[3] || "",
            answer: String(question.answer ?? 0),
            explanation: question.explanation || ""
        });
    }

    function clearForm() {
        setEditingIndex(null);
        setForm(emptyForm);
    }

    function saveQuestion() {
        if (!form.question || !form.optionA || !form.optionB || !form.optionC || !form.optionD) {
            alert("Please complete the question and all four options.");
            return;
        }

        const item = {
            id: editingIndex !== null ? questions[editingIndex].id : `question-${Date.now()}`,
            question: form.question,
            options: [form.optionA, form.optionB, form.optionC, form.optionD],
            answer: Number(form.answer),
            explanation: form.explanation
        };

        const nextQuestions = [...questions];

        if (editingIndex !== null) {
            nextQuestions[editingIndex] = item;
        } else {
            nextQuestions.push(item);
        }

        setQuestions(nextQuestions);
        saveQuestions(nextQuestions);
        clearForm();
    }

    function deleteQuestion(index) {
        if (!confirm("Delete this question?")) return;
        const nextQuestions = questions.filter((_, itemIndex) => itemIndex !== index);
        setQuestions(nextQuestions);
        saveQuestions(nextQuestions);
        clearForm();
    }

    function restoreDefaultQuestions() {
        if (!confirm("Reset questions from seed file?")) return;
        const defaults = resetQuestions();
        setQuestions(defaults);
        clearForm();
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                    Admin
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    Quiz Manager
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Add, edit, delete, and reset quiz questions.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black dark:text-white">
                        {editingIndex !== null ? <Edit3 size={20} /> : <Plus size={20} />}
                        {editingIndex !== null ? "Edit Question" : "Add Question"}
                    </h2>

                    <div className="space-y-3">
                        <textarea
                            value={form.question}
                            onChange={(e) => setForm({ ...form, question: e.target.value })}
                            placeholder="Question"
                            rows="3"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        {["optionA", "optionB", "optionC", "optionD"].map((field, index) => (
                            <input
                                key={field}
                                value={form[field]}
                                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        ))}

                        <select
                            value={form.answer}
                            onChange={(e) => setForm({ ...form, answer: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="0">Correct Answer: A</option>
                            <option value="1">Correct Answer: B</option>
                            <option value="2">Correct Answer: C</option>
                            <option value="3">Correct Answer: D</option>
                        </select>

                        <textarea
                            value={form.explanation}
                            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                            placeholder="Short explanation"
                            rows="3"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <button onClick={saveQuestion} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white">
                            <Save size={18} />
                            Save Question
                        </button>

                        <button onClick={clearForm} className="w-full rounded-2xl border px-5 py-3 font-bold dark:text-white">
                            Clear
                        </button>

                        <button onClick={restoreDefaultQuestions} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white dark:bg-white dark:text-slate-950">
                            <RotateCcw size={18} />
                            Reset From Seed
                        </button>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                    <h2 className="mb-4 font-black dark:text-white">
                        Question Bank ({questions.length})
                    </h2>

                    <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
                        {questions.map((question, index) => (
                            <div key={question.id || index} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                                <p className="font-black dark:text-white">
                                    Q{index + 1}: {question.question}
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                    Correct: {question.options?.[question.answer]}
                                </p>

                                <div className="mt-3 flex gap-2">
                                    <button onClick={() => fillForm(question, index)} className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                                        Edit
                                    </button>
                                    <button onClick={() => deleteQuestion(index)} className="rounded-xl bg-red-50 px-4 py-2 text-red-700">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {!questions.length && (
                            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                                No questions found. Upload CSV or reset from seed.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
