import { useEffect, useMemo, useState } from "react";
import {
    Eye,
    Layers,
    Plus,
    Save,
    Search,
    Trash2,
    X
} from "lucide-react";
import { DATA_UPDATED_EVENT, getFlashcards, saveFlashcards } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";

const emptyFlashcard = {
    question: "",
    answer: "",
    explanation: "",
    status: "Active"
};

export default function FlashcardManager() {
    const [flashcards, setFlashcards] = useState(getFlashcards());
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyFlashcard);
    const [selectedCard, setSelectedCard] = useState(null);
    const [dialog, setDialog] = useState(null);

    useEffect(() => {
        function refreshFlashcardsFromCache() {
            const nextFlashcards = getFlashcards();

            setFlashcards(nextFlashcards);
            setSelectedCard(currentCard => {
                if (!currentCard) return currentCard;
                return nextFlashcards.find(card => String(card.id) === String(currentCard.id)) || null;
            });
        }

        window.addEventListener(DATA_UPDATED_EVENT, refreshFlashcardsFromCache);

        return () => {
            window.removeEventListener(DATA_UPDATED_EVENT, refreshFlashcardsFromCache);
        };
    }, []);

    const filteredFlashcards = useMemo(() => {
        const keyword = search.toLowerCase();

        return flashcards.filter((card) => {
            const matchesSearch = `${card.question} ${card.answer} ${card.explanation}`
                .toLowerCase()
                .includes(keyword);

            const matchesStatus =
                statusFilter === "All" || String(card.status || "Active") === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [flashcards, search, statusFilter]);

    function closeDialog() {
        setDialog(null);
    }

    function showMessage(type, title, message) {
        setDialog({
            type,
            title,
            message,
            confirmText: "Done",
            onConfirm: closeDialog
        });
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyFlashcard);
    }

    function saveCard() {
        if (!form.question || !form.answer) {
            showMessage(
                "warning",
                "Incomplete Flashcard",
                "Please complete the question/front side and answer/back side before saving."
            );
            return;
        }

        let nextFlashcards;

        if (editingId) {
            nextFlashcards = flashcards.map((card) =>
                card.id === editingId
                    ? {
                          ...card,
                          question: form.question,
                          answer: form.answer,
                          explanation: form.explanation,
                          status: form.status
                      }
                    : card
            );
        } else {
            nextFlashcards = [
                ...flashcards,
                {
                    id: `flashcard-${Date.now()}`,
                    question: form.question,
                    answer: form.answer,
                    explanation: form.explanation,
                    status: form.status
                }
            ];
        }

        setFlashcards(nextFlashcards);
        saveFlashcards(nextFlashcards);
        resetForm();

        showMessage(
            "success",
            editingId ? "Flashcard Updated" : "Flashcard Added",
            "The flashcard has been saved successfully."
        );
    }

    function editCard(card) {
        setEditingId(card.id);
        setForm({
            question: card.question || "",
            answer: card.answer || "",
            explanation: card.explanation || "",
            status: card.status || "Active"
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function askDeleteCard(card) {
        setDialog({
            type: "danger",
            title: "Delete Flashcard?",
            message: "This will permanently remove the selected flashcard from the flashcard bank.",
            confirmText: "Delete Flashcard",
            cancelText: "Cancel",
            onConfirm: () => deleteCard(card.id),
            onCancel: closeDialog
        });
    }

    function deleteCard(id) {
        const nextFlashcards = flashcards.filter((card) => card.id !== id);

        setFlashcards(nextFlashcards);
        saveFlashcards(nextFlashcards);

        if (selectedCard?.id === id) setSelectedCard(null);
        if (editingId === id) resetForm();

        setDialog({
            type: "success",
            title: "Flashcard Deleted",
            message: "The selected flashcard has been removed successfully.",
            confirmText: "Done",
            onConfirm: closeDialog
        });
    }

    function saveAll() {
        saveFlashcards(flashcards);

        showMessage(
            "success",
            "Flashcards Synced",
            "All flashcard changes have been saved."
        );
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            {selectedCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                                    Flashcard Preview
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                                    View Flashcard
                                </h2>
                            </div>

                            <button
                                onClick={() => setSelectedCard(null)}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                aria-label="Close preview"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Question / Front
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                    {selectedCard.question}
                                </p>
                            </div>

                            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-sky-500/20 dark:bg-sky-500/10">
                                <p className="text-xs font-black uppercase tracking-wide text-blue-700 dark:text-sky-200">
                                    Answer / Back
                                </p>
                                <p className="mt-2 text-lg font-black text-blue-950 dark:text-white">
                                    {selectedCard.answer}
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Explanation
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    {selectedCard.explanation || "No explanation added."}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <button
                                onClick={() => {
                                    editCard(selectedCard);
                                    setSelectedCard(null);
                                }}
                                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                            >
                                Edit Flashcard
                            </button>

                            <button
                                onClick={() => setSelectedCard(null)}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                            Admin
                        </p>
                        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            Flashcard Manager
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Add, edit, view, delete, and manage flashcards separately from quiz questions.
                        </p>
                    </div>

                    <button
                        onClick={saveAll}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                        <Save size={18} />
                        Save All Changes
                    </button>
                </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                        <Plus size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            {editingId ? "Edit Flashcard" : "Add Flashcard"}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            The question is the front of the card. The answer is the back of the card.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3">
                    <textarea
                        value={form.question}
                        onChange={(event) => setForm({ ...form, question: event.target.value })}
                        placeholder="Question / front side"
                        rows="3"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <textarea
                        value={form.answer}
                        onChange={(event) => setForm({ ...form, answer: event.target.value })}
                        placeholder="Answer / back side"
                        rows="3"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <textarea
                        value={form.explanation}
                        onChange={(event) => setForm({ ...form, explanation: event.target.value })}
                        placeholder="Explanation"
                        rows="3"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <select
                            value={form.status}
                            onChange={(event) => setForm({ ...form, status: event.target.value })}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        <button
                            onClick={saveCard}
                            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                        >
                            {editingId ? "Update Flashcard" : "Add Flashcard"}
                        </button>

                        {editingId && (
                            <button
                                onClick={resetForm}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-white"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Flashcard Bank
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {filteredFlashcards.length} of {flashcards.length} flashcards shown
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="All">All</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                            <Search size={18} className="text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search flashcards..."
                                className="w-full bg-transparent text-sm outline-none dark:text-white md:w-72"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[980px] border-collapse bg-white text-sm dark:bg-slate-950">
                        <thead>
                            <tr className="bg-slate-100 text-left text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                <th className="border px-3 py-3 dark:border-slate-700">#</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Question</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Answer</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Status</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredFlashcards.map((card, index) => (
                                <tr key={card.id || index} className="dark:text-white">
                                    <td className="border px-3 py-3 font-bold dark:border-slate-700">
                                        {index + 1}
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <p className="line-clamp-2 font-bold text-slate-900 dark:text-white">
                                            {card.question}
                                        </p>
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <p className="line-clamp-2 text-slate-600 dark:text-slate-300">
                                            {card.answer}
                                        </p>
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-black ${
                                                String(card.status || "Active") === "Active"
                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                                                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200"
                                            }`}
                                        >
                                            {card.status || "Active"}
                                        </span>
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setSelectedCard(card)}
                                                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            >
                                                <Eye size={15} />
                                            </button>

                                            <button
                                                onClick={() => editCard(card)}
                                                className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-700"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() => askDeleteCard(card)}
                                                className="rounded-xl bg-red-50 px-3 py-2 text-red-700"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!filteredFlashcards.length && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        No flashcards found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
