import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Lock, ShieldCheck, UserPlus } from "lucide-react";
import { api } from "../lib/api";

const DRAFT_KEY = "uapl_registration_draft_v1";

function getInitialForm() {
    const startedAt = Date.now();

    try {
        const saved = localStorage.getItem(DRAFT_KEY);

        if (saved) {
            const parsed = JSON.parse(saved);

            return {
                name: parsed.name || "",
                username: parsed.username || "",
                email: parsed.email || "",
                password: parsed.password || "",
                confirmPassword: parsed.confirmPassword || "",
                notRobot: parsed.notRobot || false,
                website: "",
                startedAt
            };
        }
    } catch {
        localStorage.removeItem(DRAFT_KEY);
    }

    return {
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        notRobot: false,
        website: "",
        startedAt
    };
}

export default function Register() {
    const [form, setForm] = useState(getInitialForm);
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const draft = {
            name: form.name,
            username: form.username,
            email: form.email,
            password: form.password,
            confirmPassword: form.confirmPassword,
            notRobot: form.notRobot
        };

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [form]);

    const passwordChecks = useMemo(() => {
        return [
            { label: "At least 8 characters", passed: form.password.length >= 8 },
            { label: "One uppercase letter", passed: /[A-Z]/.test(form.password) },
            { label: "One lowercase letter", passed: /[a-z]/.test(form.password) },
            { label: "One number", passed: /[0-9]/.test(form.password) },
            { label: "Passwords match", passed: form.password && form.password === form.confirmPassword }
        ];
    }, [form.password, form.confirmPassword]);

    const canSubmit = passwordChecks.every(item => item.passed);

    function updateForm(field, value) {
        const nextValue = field === "username"
            ? value.toLowerCase().replace(/\s+/g, "")
            : value;

        setForm(previous => ({
            ...previous,
            [field]: nextValue
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus(null);

        if (!canSubmit) {
            setStatus({
                type: "error",
                message: "Please complete the password security requirements."
            });
            return;
        }

        if (!form.notRobot) {
            setStatus({
                type: "error",
                message: "Please confirm that you are not a robot."
            });
            return;
        }

        try {
            setSubmitting(true);

            const result = await api.registerUser({
                name: form.name,
                username: form.username,
                email: form.email,
                password: form.password,
                notRobot: form.notRobot,
                website: form.website,
                startedAt: form.startedAt
            });

            if (!result.success) {
                setStatus({
                    type: "error",
                    message: result.message || "Unable to submit registration."
                });
                return;
            }

            localStorage.removeItem(DRAFT_KEY);

            setForm({
                name: "",
                username: "",
                email: "",
                password: "",
                confirmPassword: "",
                notRobot: false,
                website: "",
                startedAt: Date.now()
            });

            setStatus({
                type: "success",
                message: result.message || "Registration submitted successfully."
            });
        } catch (error) {
            setStatus({
                type: "error",
                message: error.message || "Unable to submit registration."
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white">
            <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl place-items-center gap-8">
               

                <form
                    onSubmit={handleSubmit}
                    className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 sm:p-8"
                >
                    <input
                        type="text"
                        value={form.website}
                        onChange={event => updateForm("website", event.target.value)}
                        className="hidden"
                        tabIndex="-1"
                        autoComplete="off"
                    />

                    <div className="mb-6">
                        <div className="mb-4 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                            <UserPlus size={26} />
                        </div>

                        <h2 className="text-3xl font-black">Create Account</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Submit your access request for approval.
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

                    <div className="space-y-4">
                        <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Full name"
                            value={form.name}
                            onChange={event => updateForm("name", event.target.value)}
                            required
                        />

                        <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            placeholder="Preferred username"
                            value={form.username}
                            onChange={event => updateForm("username", event.target.value)}
                            required
                        />

                        <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            type="email"
                            placeholder="Email address"
                            value={form.email}
                            onChange={event => updateForm("email", event.target.value)}
                            required
                        />

                        <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={event => updateForm("password", event.target.value)}
                            required
                        />

                        <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            type="password"
                            placeholder="Confirm password"
                            value={form.confirmPassword}
                            onChange={event => updateForm("confirmPassword", event.target.value)}
                            required
                        />
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {passwordChecks.map(item => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-2 text-xs font-semibold ${
                                    item.passed ? "text-emerald-600" : "text-slate-400"
                                }`}
                            >
                                <CheckCircle2 size={14} />
                                {item.label}
                            </div>
                        ))}
                    </div>

                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-950">
                        <input
                            type="checkbox"
                            checked={form.notRobot}
                            onChange={event => updateForm("notRobot", event.target.checked)}
                            className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />

                        <span>
                            <span className="block font-bold text-slate-900 dark:text-white">
                                I’m not a robot
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                I confirm that I am submitting this registration request personally.
                            </span>
                        </span>
                    </label>

                    <button
                        disabled={submitting || !canSubmit || !form.notRobot}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Lock size={18} />
                        {submitting ? "Submitting Request..." : "Submit Registration"}
                    </button>

                    <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-center">
                        <span>Already have an account?</span>
                        <Link to="/login" className="font-bold text-sky-600 hover:text-sky-700">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
