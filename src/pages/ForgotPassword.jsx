import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { api } from "../lib/api";

export default function ForgotPassword() {
    const [identity, setIdentity] = useState("");
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus(null);

        try {
            setSubmitting(true);

            const result = await api.requestPasswordReset(identity);

            setStatus({
                type: result.success ? "success" : "error",
                message: result.message || "Request completed."
            });
        } catch (error) {
            setStatus({
                type: "error",
                message: error.message || "Unable to process password reset."
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 dark:bg-slate-950">
            <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <KeyRound size={28} />
                    </div>

                    <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                        Forgot Password
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Enter your username or email. If your active account exists, a temporary password will be sent to your registered email.
                    </p>
                </div>

                {status && (
                    <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        status.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
                    }`}>
                        {status.message}
                    </div>
                )}

                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="Username or email"
                        value={identity}
                        onChange={event => setIdentity(event.target.value)}
                        required
                    />
                </div>

                <button
                    disabled={submitting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 disabled:opacity-50"
                >
                    {submitting ? "Sending..." : "Send Reset Email"}
                </button>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-sm font-bold text-sky-600 hover:text-sky-700">
                        Back to sign in
                    </Link>
                </div>
            </form>
        </div>
    );
}
