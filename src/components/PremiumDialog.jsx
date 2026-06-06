import {
    AlertTriangle,
    CheckCircle2,
    Info,
    ShieldAlert,
    X
} from "lucide-react";

const styles = {
    info: {
        icon: Info,
        box: "bg-blue-100 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300",
        button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
    },
    success: {
        icon: CheckCircle2,
        box: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
        button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
    },
    warning: {
        icon: AlertTriangle,
        box: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
        button: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
    },
    danger: {
        icon: ShieldAlert,
        box: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
        button: "bg-red-600 hover:bg-red-700 shadow-red-600/20"
    }
};

export default function PremiumDialog({
    open,
    type = "info",
    title,
    message,
    confirmText = "Continue",
    cancelText,
    justify = false,
    onConfirm,
    onCancel,
    onClose
}) {
    if (!open) return null;

    const current = styles[type] || styles.info;
    const Icon = current.icon;

    function closeDialog() {
        if (onClose) onClose();
        else if (onCancel) onCancel();
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                        <div className={`rounded-2xl p-3 ${current.box}`}>
                            <Icon size={24} />
                        </div>

                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                {title}
                            </h2>

                            <p
                                className={`mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300 ${
                                    justify ? "text-justify" : ""
                                }`}
                            >
                                {message}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closeDialog}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {cancelText && (
                        <button
                            onClick={onCancel}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {cancelText}
                        </button>
                    )}

                    <button
                        onClick={onConfirm}
                        className={`rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition ${current.button} ${
                            cancelText ? "" : "sm:col-span-2"
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
