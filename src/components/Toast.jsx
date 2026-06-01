import { CheckCircle, Info, AlertTriangle } from "lucide-react";

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const Icon =
    toast.type === "success" ? CheckCircle :
    toast.type === "warning" ? AlertTriangle :
    Info;

  return (
    <div className="fixed bottom-5 right-5 z-[110] w-[min(360px,calc(100vw-32px))] rounded-2xl border border-white/60 bg-white/90 p-4 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-black">{toast.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{toast.message}</p>
          <button className="mt-2 text-sm font-black text-blue-600" onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
