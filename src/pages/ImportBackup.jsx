import { useRef, useState } from "react";
import {
    CheckCircle2,
    Database,
    Download,
    FileJson,
    FileSpreadsheet,
    RotateCcw,
    Upload
} from "lucide-react";
import {
    exportBackup,
    getFlashcards,
    getQuestions,
    restoreBackup,
    saveFlashcards,
    saveQuestions
} from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";

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

    if (current || row.length) row.push(current.trim());
    if (row.length) rows.push(row);

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

function escapeCsv(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content, type = "text/csv") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function questionsToCsv(questions) {
    const lines = [
        "question,optionA,optionB,optionC,optionD,answer,explanation"
    ];

    questions.forEach((item) => {
        const answerLetter = ["A", "B", "C", "D"][item.answer] || "A";
        lines.push(
            [
                item.question,
                item.options?.[0],
                item.options?.[1],
                item.options?.[2],
                item.options?.[3],
                answerLetter,
                item.explanation
            ].map(escapeCsv).join(",")
        );
    });

    return lines.join("\n");
}

export default function ImportBackup() {
    const questionInputRef = useRef(null);
    const flashcardInputRef = useRef(null);
    const backupInputRef = useRef(null);

    const [dialog, setDialog] = useState(null);
    const [pendingBackupFile, setPendingBackupFile] = useState(null);

    function showDialog(type, title, message) {
        setDialog({
            type,
            title,
            message,
            confirmText: "Done",
            onConfirm: () => setDialog(null)
        });
    }

    async function handleQuestionCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const rows = csvToObjects(text);

            const importedQuestions = rows
                .map((row, index) => ({
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
                }))
                .filter((item) => item.question && item.options.every(Boolean));

            const existing = getQuestions();
            saveQuestions([...existing, ...importedQuestions]);

            showDialog(
                "success",
                "Questions Uploaded",
                `${importedQuestions.length} questions were added to your quiz bank.`
            );
        } catch {
            showDialog(
                "danger",
                "Upload Failed",
                "The question CSV could not be processed. Please check the template format."
            );
        }

        event.target.value = "";
    }

    async function handleFlashcardCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const rows = csvToObjects(text);

            const importedFlashcards = rows
                .map((row, index) => ({
                    id: row.id || `flashcard-${Date.now()}-${index}`,
                    question: row.question || row.front,
                    answer: row.answer || row.back,
                    explanation: row.explanation || ""
                }))
                .filter((item) => item.question && item.answer);

            const existing = getFlashcards();
            saveFlashcards([...existing, ...importedFlashcards]);

            showDialog(
                "success",
                "Flashcards Uploaded",
                `${importedFlashcards.length} flashcards were added successfully.`
            );
        } catch {
            showDialog(
                "danger",
                "Upload Failed",
                "The flashcard CSV could not be processed. Please check the template format."
            );
        }

        event.target.value = "";
    }

    function downloadQuestionTemplate() {
        const csv = [
            "question,optionA,optionB,optionC,optionD,answer,explanation",
            `"What is the minimum UA registration weight?","250 g","1.5 kg","7 kg","25 kg","A","UA above 250 g must be registered."`
        ].join("\n");

        downloadTextFile("question-upload-template.csv", csv);
    }

    function downloadFlashcardTemplate() {
        const csv = [
            "question,answer,explanation",
            `"What does CAAS stand for?","Civil Aviation Authority of Singapore","CAAS regulates aviation in Singapore."`
        ].join("\n");

        downloadTextFile("flashcard-upload-template.csv", csv);
    }

    function downloadCurrentQuestionsCsv() {
        const questions = getQuestions();
        downloadTextFile("uapl-current-questions.csv", questionsToCsv(questions));
    }

    function downloadBackup() {
        const backup = exportBackup();
        downloadTextFile(
            `uapl-lms-backup-${new Date().toISOString().slice(0, 10)}.json`,
            JSON.stringify(backup, null, 2),
            "application/json"
        );

        showDialog(
            "success",
            "Backup Downloaded",
            "Your local users, questions, flashcards, course notes, and settings were exported as JSON."
        );
    }

    function askRestoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        setPendingBackupFile(file);
        setDialog({
            type: "warning",
            title: "Restore Backup?",
            message:
                "This will replace your current local browser data with the selected backup file.",
            confirmText: "Restore Backup",
            cancelText: "Cancel",
            onConfirm: restoreSelectedBackup,
            onCancel: () => {
                setPendingBackupFile(null);
                setDialog(null);
                event.target.value = "";
            }
        });
    }

    async function restoreSelectedBackup() {
        if (!pendingBackupFile) return;

        try {
            const text = await pendingBackupFile.text();
            const data = JSON.parse(text);
            restoreBackup(data);

            setPendingBackupFile(null);
            setDialog({
                type: "success",
                title: "Backup Restored",
                message: "Your backup was restored. Refresh the page to reload the updated data.",
                confirmText: "Refresh Now",
                onConfirm: () => window.location.reload()
            });
        } catch {
            setDialog({
                type: "danger",
                title: "Restore Failed",
                message: "The selected JSON backup is invalid or could not be restored.",
                confirmText: "Close",
                onConfirm: () => setDialog(null)
            });
        }
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                            Admin Tools
                        </p>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                            Import & Backup Center
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Upload CSV files, download templates, export questions, and restore JSON backups.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 dark:bg-sky-500/10 dark:text-sky-200">
                        Browser Storage
                    </div>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <ToolCard
                    icon={<FileSpreadsheet size={24} />}
                    color="blue"
                    title="Upload Questions CSV"
                    description="Add new questions to the quiz bank."
                    note="Columns: question, optionA, optionB, optionC, optionD, answer, explanation"
                    buttonText="Upload Questions CSV"
                    onClick={() => questionInputRef.current.click()}
                />

                <ToolCard
                    icon={<Database size={24} />}
                    color="cyan"
                    title="Upload Flashcards CSV"
                    description="Add standalone flashcards for study mode."
                    note="Columns: question, answer, explanation"
                    buttonText="Upload Flashcards CSV"
                    onClick={() => flashcardInputRef.current.click()}
                />

                <ToolCard
                    icon={<Download size={24} />}
                    color="emerald"
                    title="Download Current Questions"
                    description="Export the current quiz bank as CSV."
                    note="Use this file as your editable master question bank."
                    buttonText="Download Questions CSV"
                    onClick={downloadCurrentQuestionsCsv}
                />

                <ToolCard
                    icon={<FileSpreadsheet size={24} />}
                    color="slate"
                    title="Download CSV Templates"
                    description="Download clean templates for questions and flashcards."
                    note="Recommended before preparing Excel/CSV uploads."
                    customActions={
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button
                                onClick={downloadQuestionTemplate}
                                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                            >
                                Question Template
                            </button>
                            <button
                                onClick={downloadFlashcardTemplate}
                                className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700"
                            >
                                Flashcard Template
                            </button>
                        </div>
                    }
                />

                <ToolCard
                    icon={<FileJson size={24} />}
                    color="emerald"
                    title="Download Backup JSON"
                    description="Export users, questions, flashcards, notes, and settings."
                    note="Use this before clearing browser data."
                    buttonText="Download Full Backup"
                    onClick={downloadBackup}
                />

                <ToolCard
                    icon={<RotateCcw size={24} />}
                    color="amber"
                    title="Restore Backup JSON"
                    description="Restore a previously downloaded backup file."
                    note="This will replace current local browser data."
                    buttonText="Restore Backup"
                    onClick={() => backupInputRef.current.click()}
                />
            </div>

            <input
                ref={questionInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleQuestionCsvUpload}
            />

            <input
                ref={flashcardInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFlashcardCsvUpload}
            />

            <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={askRestoreBackup}
            />
        </div>
    );
}

function ToolCard({
    icon,
    color,
    title,
    description,
    note,
    buttonText,
    onClick,
    customActions
}) {
    const colors = {
        blue: "bg-blue-100 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300",
        cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
        slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
    };

    return (
        <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${colors[color]}`}>
                    {icon}
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        {title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                {note}
            </div>

            {customActions || (
                <button
                    onClick={onClick}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                    <Upload size={18} />
                    {buttonText}
                </button>
            )}
        </div>
    );
}
