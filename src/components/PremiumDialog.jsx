import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export default function PremiumDialog({
  open,
  type = "info",
  title,
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose
}) {
  if (!open) return null;

  const iconMap = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle
  };

  const toneMap = {
    info: "bg-blue-600",
    success: "bg-emerald-600",
    warning: "bg-amber-500"
  };

  const Icon = iconMap[type] || Info;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-3xl border border-white/50 bg-white/90 p-6 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
        <div className="flex items-start justify-between gap-4">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${toneMap[type]}`}>
            <Icon size={22} />
          </div>

          <button className="btn-soft !h-10 !min-h-10 !w-10 !p-0" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-5 text-2xl font-black">{title}</h2>
        {message && <p className="mt-2 text-slate-500 dark:text-slate-400">{message}</p>}

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-soft" onClick={onClose}>{cancelText}</button>
          {onConfirm && (
            <button className={type === "warning" ? "bg-red-600 hover:bg-red-700" : "btn-primary"} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
