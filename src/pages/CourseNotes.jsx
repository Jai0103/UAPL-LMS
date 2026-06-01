import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { getCourseNotes, saveCourseNotes } from "../lib/storage";

export default function CourseNotes({ session }) {
    const [notes, setNotes] = useState(getCourseNotes());
    const [selectedNote, setSelectedNote] = useState(null);
    const [form, setForm] = useState({ title: "", url: "" });

    const isAdmin = session?.role === "admin";

    function addNote() {
        if (!form.title || !form.url) {
            alert("Please enter title and PDF URL.");
            return;
        }

        const nextNotes = [
            ...notes,
            {
                id: `note-${Date.now()}`,
                title: form.title,
                url: form.url,
                createdAt: new Date().toISOString().slice(0, 10)
            }
        ];

        setNotes(nextNotes);
        saveCourseNotes(nextNotes);
        setForm({ title: "", url: "" });
    }

    function deleteNote(id) {
        if (!confirm("Delete this course note?")) return;
        const nextNotes = notes.filter((note) => note.id !== id);
        setNotes(nextNotes);
        saveCourseNotes(nextNotes);
        if (selectedNote?.id === id) setSelectedNote(null);
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                    Learning Resources
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    Course Notes
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    View PDF notes and training materials.
                </p>
            </div>

            {isAdmin && (
                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-black dark:text-white">
                        <Plus size={20} />
                        Add PDF Note
                    </h2>

                    <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                        <input
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="PDF title"
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <input
                            value={form.url}
                            onChange={(e) => setForm({ ...form, url: e.target.value })}
                            placeholder="PDF URL, example: /UAPL-LMS/notes/uapl-notes.pdf"
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <button onClick={addNote} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white">
                            Add
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                    <h2 className="mb-4 font-black dark:text-white">Available Notes</h2>

                    <div className="space-y-3">
                        {notes.map((note) => (
                            <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                                <button onClick={() => setSelectedNote(note)} className="flex w-full items-center gap-3 text-left">
                                    <FileText className="text-blue-600" />
                                    <div>
                                        <p className="font-black dark:text-white">{note.title}</p>
                                        <p className="text-xs text-slate-500">{note.createdAt}</p>
                                    </div>
                                </button>

                                {isAdmin && (
                                    <button onClick={() => deleteNote(note.id)} className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                                        <Trash2 size={15} />
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))}

                        {!notes.length && (
                            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                                No course notes yet. Admin can add PDF links here.
                            </p>
                        )}
                    </div>
                </div>

                <div className="min-h-[600px] rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75">
                    {selectedNote ? (
                        <>
                            <h2 className="mb-4 text-lg font-black dark:text-white">{selectedNote.title}</h2>
                            <iframe
                                src={selectedNote.url}
                                title={selectedNote.title}
                                className="h-[650px] w-full rounded-2xl border border-slate-200 dark:border-slate-700"
                            />
                        </>
                    ) : (
                        <div className="flex h-[520px] items-center justify-center text-center text-slate-500">
                            Select a PDF note to preview.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
