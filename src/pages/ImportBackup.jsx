import { useRef, useState } from "react";
import {
    Download,
    FileJson,
    FileSpreadsheet,
    RotateCcw,
    Upload,
    Database,
    CheckCircle2
} from "lucide-react";
import {
    exportBackup,
    getFlashcards,
    getQuestions,
    restoreBackup,
    saveFlashcards,
    saveQuestions
} from "../lib/storage";

function parseCsv(text) {
    const rows = [];
    let current = "";
    let row = [];
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            row.push(current.trim());
            current = "";
        } else if ((char === "\n" || char === "\r") && !insideQuotes) {
            if (current || row.length) {
                row.push(current.trim());
                rows.push(row);
                row = [];
                current = "";
            }

            if (char === "\r" && next === "\n") i++;
        } else {
            current += char;
        }
    }

    if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
    }

    return rows.filter((item) => item.some(Boolean));
}

function normalizeHeader(value) {
    return value.toLowerCase().trim().replace(/\s+/g, "");
}

function csvToObjects(text) {
    const rows = parseCsv(text);
    const headers = rows[0].map(normalizeHeader);

    return rows.slice(1).map((row) => {
        const item = {};
        headers.forEach((header, index) => {
            item[header] = row[index] || "";
        });
        return item;
    });
}

function answerToIndex(answer) {
    const value = String(answer).trim().toLowerCase();

    if (value === "a" || value === "0") return 0;
    if (value === "b" || value === "1") return 1;
    if (value === "c" || value === "2") return 2;
    if (value === "d" || value === "3") return 3;

    return 0;
}

export default function ImportBackup() {
    const questionInputRef = useRef(null);
    const flashcardInputRef = useRef(null);
    const backupInputRef = useRef(null);
    const [message, setMessage] = useState("");

    function showMessage(text) {
        setMessage(text);
        setTimeout(() => setMessage(""), 3500);
    }

    async function handleQuestionCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const text = await file.text();
        const rows = csvToObjects(text);

        const importedQuestions = rows.map((row, index) => ({
            id: row.id || `question-${Date.now()}-${index}`,
            question: row.question,
            options: [
                row.optiona || row.a,
                row.optionb || row.b,
                row.optionc || row.c,
                row.optiond || row.d
            ],
            answer: answerToIndex(row.answer),
            explanation: row.explanation || ""
        })).filter((item) => item.question && item.options.every(Boolean));

        const existing = getQuestions();
        saveQuestions([...existing, ...importedQuestions]);

        event.target.value = "";
        showMessage(`${importedQuestions.length} questions uploaded successfully.`);
    }

    async function handleFlashcardCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const text = await file.text();
        const rows = csvToObjects(text);

        const importedFlashcards = rows.map((row, index) => ({
            id: row.id || `flashcard-${Date.now()}-${index}`,
            question: row.question || row.front,
            answer: row.answer || row.back,
            explanation: row.explanation || ""
        })).filter((item) => item.question && item.answer);

        const existing = getFlashcards();
        saveFlashcards([...existing, ...importedFlashcards]);

        event.target.value = "";
        showMessage(`${importedFlashcards.length} flashcards uploaded successfully.`);
    }

    function downloadBackup() {
        const backup = exportBackup();
        const blob = new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `uapl-lms-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();

        URL.revokeObjectURL(url);
        showMessage("Backup JSON downloaded successfully.");
    }

    async function restoreFromBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const confirmRestore = window.confirm(
            "This will replace your current local data with the backup file. Continue?"
        );

        if (!confirmRestore) {
            event.target.value = "";
            return;
        }

        const text = await file.text();
        const data = JSON.parse(text);

        restoreBackup(data);

        event.target.value = "";
        showMessage("Backup restored successfully. Please refresh the page.");
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-sky-300">
                            Admin Tools
                        </p>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                            Import & Backup Center
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Upload question banks, flashcards, and restore saved localStorage backups.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:bg-sky-500/10 dark:text-sky-200">
                        Local Storage Only
                    </div>
                </div>
            </div>

            {message && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <CheckCircle2 size={18} />
                    {message}
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                Upload Questions CSV
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Adds questions to the quiz question bank.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                        CSV columns:
                        <br />
                        <strong>question, optionA, optionB, optionC, optionD, answer, explanation</strong>
                        <br />
                        Answer can be A, B, C, or D.
                    </div>

                    <input
                        ref={questionInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleQuestionCsvUpload}
                    />

                    <button
                        onClick={() => questionInputRef.current.click()}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                        <Upload size={18} />
                        Upload Questions CSV
                    </button>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                Upload Flashcards CSV
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Adds standalone flashcards for study mode.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                        CSV columns:
                        <br />
                        <strong>question, answer, explanation</strong>
                        <br />
                        You may also use front, back, explanation.
                    </div>

                    <input
                        ref={flashcardInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFlashcardCsvUpload}
                    />

                    <button
                        onClick={() => flashcardInputRef.current.click()}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700"
                    >
                        <Upload size={18} />
                        Upload Flashcards CSV
                    </button>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <Download size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                Download Backup JSON
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Saves users, questions, flashcards, notes, and settings.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={downloadBackup}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                    >
                        <FileJson size={18} />
                        Download Backup
                    </button>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                Restore Backup JSON
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Restores your last saved backup after browser data is cleared.
                            </p>
                        </div>
                    </div>

                    <input
                        ref={backupInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={restoreFromBackup}
                    />

                    <button
                        onClick={() => backupInputRef.current.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-bold text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600"
                    >
                        <Upload size={18} />
                        Restore Backup
                    </button>
                </div>
            </div>
        </div>
    );
}
