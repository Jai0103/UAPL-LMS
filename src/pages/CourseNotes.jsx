import { ExternalLink, FileText, Plus, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { getCourseNotes, saveCourseNotes } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";
import Toast from "../components/Toast";

export default function CourseNotes({ user }) {
  const [notes, setNotes] = useState(getCourseNotes());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "General",
    url: "",
    fileData: ""
  });

  const isAdmin = user.role === "admin";

  const filteredNotes = useMemo(() => {
    return notes.filter((note) =>
      `${note.title} ${note.category}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [notes, search]);

  function saveAll(nextNotes) {
    setNotes(nextNotes);
    saveCourseNotes(nextNotes);
  }

  function addNote() {
    if (!form.title.trim() || (!form.url.trim() && !form.fileData)) {
      setToast({
        type: "warning",
        title: "Missing note details",
        message: "Please add a title and either a PDF URL or uploaded PDF file."
      });
      return;
    }

    const nextNotes = [
      ...notes,
      {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        category: form.category.trim() || "General",
        url: form.fileData || form.url.trim(),
        sourceType: form.fileData ? "local-upload" : "url",
        createdAt: new Date().toISOString()
      }
    ];

    saveAll(nextNotes);
    setForm({ title: "", category: "General", url: "", fileData: "" });
    setDialogOpen(false);
    setToast({
      type: "success",
      title: "Course note added",
      message: "The PDF note is now available in Course Notes."
    });
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setToast({
        type: "warning",
        title: "PDF required",
        message: "Please upload a PDF file only."
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        fileData: reader.result
      }));
    };
    reader.readAsDataURL(file);
  }

  function confirmDelete() {
    saveAll(notes.filter((note) => note.id !== pendingDelete));
    setPendingDelete(null);
    setToast({
      type: "success",
      title: "Course note deleted",
      message: "The note has been removed from this browser."
    });
  }

  return (
    <div className="space-y-5">
      <section className="card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Training Library</p>
          <h1 className="text-3xl font-black">Course Notes</h1>
          <p className="text-slate-500 dark:text-slate-400">
            View PDF references, flight theory notes, and exam preparation material.
          </p>
        </div>

        {isAdmin && (
          <button className="btn-primary" onClick={() => setDialogOpen(true)}>
            <Plus size={18} />
            Add PDF Note
          </button>
        )}
      </section>

      <section className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-11"
            placeholder="Search course notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredNotes.map((note, index) => (
          <article key={note.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                <FileText />
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                #{index + 1}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-black">{note.title}</h2>
            <p className="mt-1 text-sm font-bold text-blue-600">{note.category}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {note.sourceType === "local-upload"
                ? "Local PDF upload. Visible on this browser only."
                : "Repository or external PDF link."}
            </p>

            <div className="mt-5 grid gap-2">
              <a className="btn-primary text-center" href={note.url} target="_blank" rel="noreferrer">
                <ExternalLink size={18} />
                Open PDF
              </a>

              {isAdmin && (
                <button className="btn-soft" onClick={() => setPendingDelete(note.id)}>
                  <Trash2 size={18} />
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {filteredNotes.length === 0 && (
        <section className="card text-center text-slate-500 dark:text-slate-400">
          No course notes found.
        </section>
      )}

      <PremiumDialog
        open={dialogOpen}
        type="info"
        title="Add Course Note"
        message="Use a PDF path from your repo for all users, or upload a local PDF for this browser only."
        confirmText="Add Note"
        onConfirm={addNote}
        onClose={() => setDialogOpen(false)}
      >
        <div className="space-y-3">
          <input
            className="input"
            placeholder="PDF title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="input"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className="input"
            placeholder="PDF URL or repo path, e.g. /UAPL-LMS/notes/uapl-guide.pdf"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-4 font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            <Upload size={18} />
            Upload PDF locally
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>

          {form.fileData && (
            <p className="text-sm font-bold text-emerald-600">PDF loaded locally and ready to add.</p>
          )}
        </div>
      </PremiumDialog>

      <PremiumDialog
        open={!!pendingDelete}
        type="warning"
        title="Delete course note?"
        message="This will remove the PDF note from localStorage on this browser."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
