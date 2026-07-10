import { useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    Download,
    FileSpreadsheet,
    Loader2,
    Plus,
    Save,
    Search,
    Trash2,
    Upload
} from "lucide-react";
import { getQuestions, saveQuestions } from "../lib/storage";
import { TRAINING_CATEGORIES, normalizeCategory } from "../lib/categoryAnalysis";

function createId() {
    if (crypto?.randomUUID) return `question-${crypto.randomUUID()}`;
    return `question-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeQuestion(question) {
    return {
        id: question.id || createId(),
        category: normalizeCategory(question.category),
        question: question.question || "",
        options: question.options || [
            question.optionA || "",
            question.optionB || "",
            question.optionC || "",
            question.optionD || ""
        ],
        answer: Number(question.answer || 0),
        explanation: question.explanation || "",
        status: question.status || "Active"
    };
}

function csvEscape(value) {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            value += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(value);
            value = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (value || row.length) {
                row.push(value);
                rows.push(row);
                row = [];
                value = "";
            }

            if (char === "\r" && next === "\n") i++;
        } else {
            value += char;
        }
    }

    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }

    return rows;
}

function answerToNumber(answer) {
    const value = String(answer || "").trim().toUpperCase();

    if (value === "A" || value === "0") return 0;
    if (value === "B" || value === "1") return 1;
    if (value === "C" || value === "2") return 2;
    if (value === "D" || value === "3") return 3;

    return 0;
}

function answerToLetter(answer) {
    return ["A", "B", "C", "D"][Number(answer)] || "A";
}

export default function QuizManager() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        async function loadQuestions() {
            try {
                const data = await Promise.resolve(getQuestions());
                setQuestions((data || []).map(normalizeQuestion));
            } finally {
                setLoading(false);
            }
        }

        loadQuestions();
    }, []);

    const filteredQuestions = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return questions.filter(item => {
            const matchesSearch =
                !keyword ||
                item.question.toLowerCase().includes(keyword) ||
                item.explanation.toLowerCase().includes(keyword);

            const matchesCategory =
                categoryFilter === "All" || item.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [questions, search, categoryFilter]);

    function showNotice(message) {
        setNotice(message);
        setTimeout(() => setNotice(""), 3500);
    }

    function updateQuestion(id, field, value) {
        setQuestions(prev =>
            prev.map(item => {
                if (item.id !== id) return item;

                if (field.startsWith("option")) {
                    const optionIndex = Number(field.replace("option", ""));
                    const nextOptions = [...item.options];
                    nextOptions[optionIndex] = value;

                    return {
                        ...item,
                        options: nextOptions
                    };
                }

                if (field === "answer") {
                    return {
                        ...item,
                        answer: Number(value)
                    };
                }

                if (field === "category") {
                    return {
                        ...item,
                        category: normalizeCategory(value)
                    };
                }

                return {
                    ...item,
                    [field]: value
                };
            })
        );
    }

    function addQuestion() {
        const newQuestion = normalizeQuestion({
            id: createId(),
            category: "General UAS Knowledge",
            question: "",
            options: ["", "", "", ""],
            answer: 0,
            explanation: "",
            status: "Active"
        });

        setQuestions(prev => [newQuestion, ...prev]);
        showNotice("New question added. Select its category before saving.");
    }

    function deleteQuestion(id) {
        const confirmed = window.confirm("Delete this question? This cannot be undone after saving.");

        if (!confirmed) return;

        setQuestions(prev => prev.filter(item => item.id !== id));
    }

    async function saveAllQuestions() {
        setSaving(true);

        try {
            const cleanQuestions = questions.map(normalizeQuestion);
            const result = await Promise.resolve(saveQuestions(cleanQuestions));

            if (result?.success === false) {
                throw new Error(result.message || "Questions could not be saved.");
            }

            setQuestions(cleanQuestions);
            showNotice("Questions and categories saved successfully.");
        } catch (error) {
            window.alert(error.message || "Unable to save questions.");
        } finally {
            setSaving(false);
        }
    }

    function downloadCSV() {
        const headers = [
            "id",
            "category",
            "question",
            "optionA",
            "optionB",
            "optionC",
            "optionD",
            "answer",
            "explanation",
            "status"
        ];

        const rows = questions.map(item => [
            item.id,
            item.category,
            item.question,
            item.options[0],
            item.options[1],
            item.options[2],
            item.options[3],
            answerToLetter(item.answer),
            item.explanation,
            item.status
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(csvEscape).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "uapl-questions-with-categories.csv";
        link.click();

        URL.revokeObjectURL(url);
    }

    function downloadTemplate() {
        const headers = [
            "category",
            "question",
            "optionA",
            "optionB",
            "optionC",
            "optionD",
            "answer",
            "explanation",
            "status"
        ];

        const example = [
            "General UAS Knowledge",
            "Which component in a UAS is responsible for providing thrust?",
            "Flight Controller",
            "Receiver",
            "Propulsion System",
            "GNSS",
            "C",
            "The propulsion system creates thrust for movement.",
            "Active"
        ];

        const csv = [headers, example]
            .map(row => row.map(csvEscape).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "uapl-question-template.csv";
        link.click();

        URL.revokeObjectURL(url);
    }

    function uploadCSV(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            const text = String(reader.result || "");
            const rows = parseCSV(text);

            if (rows.length < 2) {
                window.alert("CSV file has no question rows.");
                return;
            }

            const headers = rows[0].map(header => String(header || "").trim());

            const imported = rows.slice(1).map((row, index) => {
                const item = {};

                headers.forEach((header, headerIndex) => {
                    item[header] = row[headerIndex] || "";
                });

                return normalizeQuestion({
                    id: item.id || createId(),
                    category: item.category,
                    question: item.question,
                    options: [
                        item.optionA || "",
                        item.optionB || "",
                        item.optionC || "",
                        item.optionD || ""
                    ],
                    answer: answerToNumber(item.answer),
                    explanation: item.explanation || "",
                    status: item.status || "Active"
                });
            });

            setQuestions(imported);
            showNotice(`${imported.length} questions imported. Click Save Changes to sync.`);
        };

        reader.readAsText(file);
        event.target.value = "";
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
                    <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Loading question manager...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                            Admin Console
                        </p>
                        <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                            Quiz Manager
                        </h1>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Add, edit, categorize, import, and export all quiz questions.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Template
                        </button>

                        <button
                            type="button"
                            onClick={downloadCSV}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>

                        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                            <Upload className="h-4 w-4" />
                            Import CSV
                            <input
                                type="file"
                                accept=".csv"
                                onChange={uploadCSV}
                                className="hidden"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={saveAllQuestions}
                            disabled={saving}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-60"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                    </div>
                </div>

                {notice && (
                    <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        {notice}
                    </div>
                )}
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Search questions or explanations"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={event => setCategoryFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                        <option value="All">All Categories</option>
                        {TRAINING_CATEGORIES.map(category => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={addQuestion}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                    >
                        <Plus className="h-4 w-4" />
                        Add Question
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredQuestions.map((item, index) => (
                    <div
                        key={item.id}
                        className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
                    >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1">
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                        Q{questions.findIndex(question => question.id === item.id) + 1}
                                    </span>

                                    <select
                                        value={item.category || "General UAS Knowledge"}
                                        onChange={event => updateQuestion(item.id, "category", event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-sm"
                                    >
                                        {TRAINING_CATEGORIES.map(category => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={item.status}
                                        onChange={event => updateQuestion(item.id, "status", event.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    >
                                        <option>Active</option>
                                        <option>Inactive</option>
                                    </select>
                                </div>

                                <textarea
                                    value={item.question}
                                    onChange={event => updateQuestion(item.id, "question", event.target.value)}
                                    placeholder="Question"
                                    rows="2"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {item.options.map((option, optionIndex) => (
                                        <div key={optionIndex} className="flex gap-2">
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                {String.fromCharCode(65 + optionIndex)}
                                            </span>

                                            <input
                                                value={option}
                                                onChange={event => updateQuestion(item.id, `option${optionIndex}`, event.target.value)}
                                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                                    <select
                                        value={item.answer}
                                        onChange={event => updateQuestion(item.id, "answer", event.target.value)}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    >
                                        <option value={0}>Correct Answer: A</option>
                                        <option value={1}>Correct Answer: B</option>
                                        <option value={2}>Correct Answer: C</option>
                                        <option value={3}>Correct Answer: D</option>
                                    </select>

                                    <input
                                        value={item.explanation}
                                        onChange={event => updateQuestion(item.id, "explanation", event.target.value)}
                                        placeholder="Explanation"
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => deleteQuestion(item.id)}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                title="Delete question"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {!filteredQuestions.length && (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
                        <p className="font-bold text-slate-500 dark:text-slate-400">
                            No questions found.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
