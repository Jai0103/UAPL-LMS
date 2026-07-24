import { useMemo, useState } from "react";
import {
    CheckCircle2,
    Edit3,
    Eye,
    FileVideo,
    Filter,
    Loader2,
    Plus,
    Save,
    Search,
    Trash2,
    Video,
    X
} from "lucide-react";
import { getCourseLessons, saveCourseLessons } from "../lib/storage";
import { TRAINING_CATEGORIES, normalizeCategory } from "../lib/categoryAnalysis";
import { getVideoEmbedUrl, getVideoOpenUrl } from "../lib/video";
import PremiumDialog from "../components/PremiumDialog";

const emptyLesson = {
    module: "General UAS Knowledge",
    title: "",
    description: "",
    videoUrl: "",
    materialUrl: "",
    duration: "",
    order: "",
    status: "Active"
};

function normalizeLessonForm(form, fallbackOrder) {
    return {
        module: normalizeCategory(form.module),
        title: form.title.trim(),
        description: form.description.trim(),
        videoUrl: form.videoUrl.trim(),
        materialUrl: form.materialUrl.trim(),
        duration: form.duration.trim(),
        order: Number(form.order || fallbackOrder),
        status: form.status || "Active"
    };
}

export default function LearningManager() {
    const [lessons, setLessons] = useState(getCourseLessons());
    const [form, setForm] = useState(emptyLesson);
    const [editingId, setEditingId] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [search, setSearch] = useState("");
    const [moduleFilter, setModuleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [saving, setSaving] = useState(false);
    const [dialog, setDialog] = useState(null);

    const filteredLessons = useMemo(() => {
        const keyword = search.toLowerCase();

        return lessons
            .filter(lesson => {
                const haystack = `${lesson.title} ${lesson.description} ${lesson.module} ${lesson.duration}`.toLowerCase();
                const matchesSearch = haystack.includes(keyword);
                const matchesModule = moduleFilter === "All" || normalizeCategory(lesson.module) === moduleFilter;
                const matchesStatus = statusFilter === "All" || String(lesson.status || "Active") === statusFilter;

                return matchesSearch && matchesModule && matchesStatus;
            })
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    }, [lessons, search, moduleFilter, statusFilter]);

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

    function updateForm(field, value) {
        setForm(previous => ({
            ...previous,
            [field]: value
        }));
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyLesson);
    }

    async function persistLessons(nextLessons, successTitle, successMessage) {
        setSaving(true);

        try {
            const sortedLessons = [...nextLessons].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

            setLessons(sortedLessons);
            await saveCourseLessons(sortedLessons);

            showMessage("success", successTitle, successMessage);
        } catch (error) {
            showMessage(
                "danger",
                "Learning Content Not Saved",
                error.message || "Unable to save the learning lessons right now."
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveLesson() {
        if (!form.title.trim()) {
            showMessage(
                "warning",
                "Lesson Title Required",
                "Please enter a lesson title before saving this learning item."
            );
            return;
        }

        if (!form.videoUrl.trim()) {
            showMessage(
                "warning",
                "Google Drive Video Required",
                "Please paste the Google Drive video link. Set the file permission to Anyone with the link can view."
            );
            return;
        }

        const normalized = normalizeLessonForm(form, lessons.length + 1);
        let nextLessons;

        if (editingId) {
            nextLessons = lessons.map(lesson =>
                lesson.id === editingId
                    ? {
                          ...lesson,
                          ...normalized,
                          updatedAt: new Date().toISOString()
                      }
                    : lesson
            );
        } else {
            nextLessons = [
                ...lessons,
                {
                    id: `lesson-${Date.now()}`,
                    ...normalized,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
        }

        resetForm();

        await persistLessons(
            nextLessons,
            editingId ? "Lesson Updated" : "Lesson Added",
            editingId
                ? "The selected learning lesson has been updated."
                : "The new video lesson has been added to the learning pathway."
        );
    }

    function editLesson(lesson) {
        setEditingId(lesson.id);
        setForm({
            module: normalizeCategory(lesson.module),
            title: lesson.title || "",
            description: lesson.description || "",
            videoUrl: lesson.videoUrl || "",
            materialUrl: lesson.materialUrl || "",
            duration: lesson.duration || "",
            order: lesson.order || "",
            status: lesson.status || "Active"
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function askDeleteLesson(lesson) {
        setDialog({
            type: "danger",
            title: "Delete Video Lesson?",
            message: `This will remove "${lesson.title}" from the learning pathway. Student progress records will remain in the database for reporting.`,
            confirmText: "Delete Lesson",
            cancelText: "Cancel",
            onConfirm: () => deleteLesson(lesson.id),
            onCancel: closeDialog
        });
    }

    async function deleteLesson(id) {
        const nextLessons = lessons.filter(lesson => lesson.id !== id);

        if (selectedLesson?.id === id) setSelectedLesson(null);
        if (editingId === id) resetForm();

        await persistLessons(
            nextLessons,
            "Lesson Deleted",
            "The selected learning lesson has been removed."
        );
    }

    async function duplicateLesson(lesson) {
        const nextLesson = {
            ...lesson,
            id: `lesson-${Date.now()}`,
            title: `${lesson.title} Copy`,
            order: lessons.length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await persistLessons(
            [...lessons, nextLesson],
            "Lesson Duplicated",
            "A copy of the selected lesson has been created."
        );
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            {selectedLesson && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/60 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
                            <div>
                                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                                    Lesson Preview
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                                    {selectedLesson.title}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedLesson(null)}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                aria-label="Close lesson preview"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_0.8fr]">
                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 dark:border-slate-800">
                                <div className="aspect-video">
                                    {selectedLesson.videoUrl ? (
                                        <iframe
                                            src={getVideoEmbedUrl(selectedLesson.videoUrl)}
                                            title={selectedLesson.title}
                                            allow="autoplay; encrypted-media; picture-in-picture"
                                            allowFullScreen
                                            className="h-full w-full"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center p-8 text-center text-slate-300">
                                            No video link added.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        Module
                                    </p>
                                    <p className="mt-2 font-black text-slate-950 dark:text-white">
                                        {normalizeCategory(selectedLesson.module)}
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        Description
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        {selectedLesson.description || "No description added."}
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    {selectedLesson.videoUrl && (
                                        <a
                                            href={getVideoOpenUrl(selectedLesson.videoUrl)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                        >
                                            <Video className="h-4 w-4" />
                                            Open Video
                                        </a>
                                    )}

                                    {selectedLesson.materialUrl && (
                                        <a
                                            href={selectedLesson.materialUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            Open Material
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
                <div className="bg-gradient-to-br from-slate-950 via-blue-900 to-sky-700 p-6 text-white sm:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide backdrop-blur">
                                <FileVideo className="h-4 w-4" />
                                Admin Learning Studio
                            </p>

                            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                                Learning Manager
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-sky-100">
                                Add Google Drive video lessons, organize them into UAPL modules, and control what students see in their Learning page.
                            </p>
                        </div>

                        <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                            <p className="text-xs font-black uppercase tracking-wide text-sky-100">
                                Published Lessons
                            </p>
                            <p className="mt-1 text-3xl font-black">
                                {lessons.filter(lesson => String(lesson.status || "Active") === "Active").length}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                        <Plus className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            {editingId ? "Edit Video Lesson" : "Add Video Lesson"}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Upload your video to Google Drive first, set it to Anyone with the link can view, then paste the link below.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                        <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Module
                            </span>
                            <select
                                value={form.module}
                                onChange={event => updateForm("module", event.target.value)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                {TRAINING_CATEGORIES.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="grid gap-2 lg:col-span-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Lesson Title
                            </span>
                            <input
                                value={form.title}
                                onChange={event => updateForm("title", event.target.value)}
                                placeholder="Example: Introduction to UAS Operations"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </label>
                    </div>

                    <label className="grid gap-2">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Description
                        </span>
                        <textarea
                            value={form.description}
                            onChange={event => updateForm("description", event.target.value)}
                            rows="4"
                            placeholder="Short description of what the student will learn."
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </label>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Google Drive Video Link
                            </span>
                            <input
                                value={form.videoUrl}
                                onChange={event => updateForm("videoUrl", event.target.value)}
                                placeholder="https://drive.google.com/file/d/..."
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </label>

                        <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Optional Material Link
                            </span>
                            <input
                                value={form.materialUrl}
                                onChange={event => updateForm("materialUrl", event.target.value)}
                                placeholder="PDF, slides, or Drive folder link"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Duration
                            </span>
                            <input
                                value={form.duration}
                                onChange={event => updateForm("duration", event.target.value)}
                                placeholder="Example: 12 min"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </label>

                        <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Order
                            </span>
                            <input
                                type="number"
                                min="1"
                                value={form.order}
                                onChange={event => updateForm("order", event.target.value)}
                                placeholder={`${lessons.length + 1}`}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </label>

                        <label className="grid gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Status
                            </span>
                            <select
                                value={form.status}
                                onChange={event => updateForm("status", event.target.value)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </label>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                Cancel Edit
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={saveLesson}
                            disabled={saving}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Saving..." : editingId ? "Update Lesson" : "Add Lesson"}
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium backdrop-blur dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <Video className="h-5 w-5" />
                        </div>

                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Video Lesson Library
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {filteredLessons.length} of {lessons.length} lessons shown
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search lessons..."
                                className="w-full bg-transparent text-sm outline-none dark:text-white md:w-64"
                            />
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <select
                                value={moduleFilter}
                                onChange={event => setModuleFilter(event.target.value)}
                                className="bg-transparent py-3 text-sm font-bold outline-none dark:text-white"
                            >
                                <option value="All">All Modules</option>
                                {TRAINING_CATEGORIES.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={event => setStatusFilter(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 lg:hidden">
                    {filteredLessons.map(lesson => (
                        <div
                            key={lesson.id}
                            className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                                        {normalizeCategory(lesson.module)}
                                    </p>
                                    <h3 className="mt-1 font-black text-slate-950 dark:text-white">
                                        {lesson.title}
                                    </h3>
                                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        Order {lesson.order || "-"} {lesson.duration ? `• ${lesson.duration}` : ""}
                                    </p>
                                </div>

                                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                    String(lesson.status || "Active") === "Active"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                }`}>
                                    {lesson.status || "Active"}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedLesson(lesson)}
                                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    aria-label="View lesson"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editLesson(lesson)}
                                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-sky-950 dark:text-sky-300"
                                    aria-label="Edit lesson"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => duplicateLesson(lesson)}
                                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    aria-label="Duplicate lesson"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => askDeleteLesson(lesson)}
                                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    aria-label="Delete lesson"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 lg:block">
                    <table className="w-full min-w-[1100px] border-collapse bg-white text-sm dark:bg-slate-950">
                        <thead>
                            <tr className="bg-slate-100 text-left text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                <th className="border px-3 py-3 dark:border-slate-700">Order</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Lesson</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Module</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Duration</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Status</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredLessons.map(lesson => (
                                <tr key={lesson.id} className="align-top dark:text-white">
                                    <td className="border px-3 py-3 font-black dark:border-slate-700">
                                        {lesson.order || "-"}
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <p className="font-black text-slate-950 dark:text-white">
                                            {lesson.title}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                            {lesson.description || "No description added."}
                                        </p>
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                            {normalizeCategory(lesson.module)}
                                        </span>
                                    </td>

                                    <td className="border px-3 py-3 font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                        {lesson.duration || "-"}
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                            String(lesson.status || "Active") === "Active"
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                        }`}>
                                            {lesson.status || "Active"}
                                        </span>
                                    </td>

                                    <td className="border px-3 py-3 dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLesson(lesson)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                                                aria-label="View lesson"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => editLesson(lesson)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition hover:bg-blue-100 dark:bg-sky-950 dark:text-sky-300"
                                                aria-label="Edit lesson"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => duplicateLesson(lesson)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                                                aria-label="Duplicate lesson"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => askDeleteLesson(lesson)}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700 transition hover:bg-red-100 dark:bg-red-950 dark:text-red-300"
                                                aria-label="Delete lesson"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!filteredLessons.length && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        No video lessons found.
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
