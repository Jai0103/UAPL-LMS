import { useMemo, useState } from "react";
import {
    CalendarPlus,
    Mail,
    Plus,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    UserCheck,
    X
} from "lucide-react";
import { getUsers, saveUsers, sendLoginEmail } from "../lib/storage";

function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addOneMonth(value) {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + 1);
        return fallback.toISOString().slice(0, 10);
    }

    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return "No date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No date";

    return date.toLocaleDateString("en-SG", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

function normalizeUser(user) {
    const username = String(user.username || "").trim().toLowerCase();
    const isMainAdmin = username === "admin" || String(user.id) === "admin-001";

    return {
        ...user,
        username,
        role: isMainAdmin ? "admin" : "student",
        status: isMainAdmin ? "Active" : user.status || "Inactive",
        expiryDate: isMainAdmin ? "" : user.expiryDate || ""
    };
}

function getAccessLabel(user) {
    const isAdmin = user.role === "admin";

    if (isAdmin) return "Administrator";
    if (String(user.status).toLowerCase() !== "active") return "Pending / Inactive";
    if (!user.expiryDate) return "Active";

    const today = new Date();
    const expiry = new Date(user.expiryDate);
    expiry.setHours(23, 59, 59, 999);

    if (today > expiry) return "Expired";
    return "Active";
}

export default function Users() {
    const [users, setUsers] = useState(() => getUsers().map(normalizeUser));
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [notice, setNotice] = useState(null);
    const [emailTarget, setEmailTarget] = useState(null);

    const [form, setForm] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        status: "Inactive",
        expiryDate: ""
    });

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const keyword = search.toLowerCase();
            const label = getAccessLabel(user);

            const matchesSearch =
                user.name?.toLowerCase().includes(keyword) ||
                user.username?.toLowerCase().includes(keyword) ||
                user.email?.toLowerCase().includes(keyword);

            const matchesStatus =
                statusFilter === "All" ||
                label.toLowerCase().includes(statusFilter.toLowerCase()) ||
                String(user.status).toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [users, search, statusFilter]);

    function showNotice(type, message) {
        setNotice({ type, message });
        setTimeout(() => setNotice(null), 3500);
    }

    function updateForm(field, value) {
        setForm(previous => ({
            ...previous,
            [field]: field === "username" ? value.toLowerCase().replace(/\s+/g, "") : value
        }));
    }

    function sanitizeUsers(list) {
        return list.map(user => normalizeUser(user));
    }

    function addUser(event) {
        event.preventDefault();

        if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
            showNotice("error", "Please complete name, username, and password.");
            return;
        }

        if (users.some(user => user.username === form.username.trim().toLowerCase())) {
            showNotice("error", "Username already exists.");
            return;
        }

        const newUser = {
            id: createId(),
            name: form.name.trim(),
            username: form.username.trim().toLowerCase(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: "student",
            status: form.status,
            expiryDate: form.status === "Active" ? form.expiryDate || addOneMonth(new Date()) : "",
            createdAt: new Date().toISOString(),
            lastLogin: ""
        };

        setUsers(previous => sanitizeUsers([...previous, newUser]));

        setForm({
            name: "",
            username: "",
            email: "",
            password: "",
            status: "Inactive",
            expiryDate: ""
        });

        showNotice("success", "Student added. Click Save All Changes to sync.");
    }

    function updateUser(id, field, value) {
        setUsers(previous =>
            sanitizeUsers(previous.map(user => {
                if (user.id !== id) return user;

                if (user.role === "admin") {
                    return {
                        ...user,
                        name: field === "name" ? value : user.name,
                        email: field === "email" ? value : user.email,
                        status: "Active",
                        expiryDate: "",
                        role: "admin"
                    };
                }

                const next = {
                    ...user,
                    [field]: field === "username" ? value.toLowerCase().replace(/\s+/g, "") : value,
                    role: "student"
                };

                if (field === "status" && value !== "Active") {
                    next.expiryDate = "";
                }

                return next;
            }))
        );
    }

    function approveUser(id) {
        setUsers(previous =>
            sanitizeUsers(previous.map(user => {
                if (user.id !== id || user.role === "admin") return user;

                return {
                    ...user,
                    role: "student",
                    status: "Active",
                    expiryDate: user.expiryDate || addOneMonth(new Date())
                };
            }))
        );
    }

    function extendUser(id) {
        setUsers(previous =>
            sanitizeUsers(previous.map(user => {
                if (user.id !== id || user.role === "admin") return user;

                return {
                    ...user,
                    role: "student",
                    status: "Active",
                    expiryDate: addOneMonth(user.expiryDate || new Date())
                };
            }))
        );
    }

    function deleteUser(id) {
        const user = users.find(item => item.id === id);

        if (user?.role === "admin") {
            showNotice("error", "The main admin account cannot be deleted.");
            return;
        }

        const confirmed = window.confirm(`Delete ${user?.name || "this student"}?`);
        if (!confirmed) return;

        setUsers(previous => previous.filter(item => item.id !== id));
    }

    async function saveAllUsers(nextUsers = users) {
        try {
            setSaving(true);

            const cleanUsers = sanitizeUsers(nextUsers);
            const result = await saveUsers(cleanUsers);

            if (result?.success === false) {
                showNotice("error", result.message || "Unable to save users.");
                return false;
            }

            setUsers(cleanUsers.map(({ password, ...user }) => user));
            showNotice("success", "Users saved to training database.");
            return true;
        } catch (error) {
            showNotice("error", error.message || "Unable to save users.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function approveAndEmail(user) {
        if (!user.email) {
            showNotice("error", "This student has no email address.");
            return;
        }

        const expiryDate = user.expiryDate || addOneMonth(new Date());

        const nextUsers = sanitizeUsers(users.map(item => {
            if (item.id !== user.id) return item;

            return {
                ...item,
                role: "student",
                status: "Active",
                expiryDate
            };
        }));

        const saved = await saveAllUsers(nextUsers);
        if (!saved) return;

        try {
            setSaving(true);
            const result = await sendLoginEmail(user.id);

            if (!result.success) {
                showNotice("error", result.message || "Unable to send activation email.");
                return;
            }

            showNotice("success", "Student approved and activation email sent.");
        } catch (error) {
            showNotice("error", error.message || "Unable to send activation email.");
        } finally {
            setSaving(false);
        }
    }

    async function confirmSendActivationEmail() {
        if (!emailTarget) return;

        try {
            setSaving(true);

            const result = await sendLoginEmail(emailTarget.id);

            if (!result.success) {
                showNotice("error", result.message || "Unable to send activation email.");
                return;
            }

            showNotice("success", "Activation email sent. Password was not changed.");
            setEmailTarget(null);
        } catch (error) {
            showNotice("error", error.message || "Unable to send activation email.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                        Admin Console
                    </p>
                    <h1 className="text-3xl font-black text-slate-950 dark:text-white">
                        User Management
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Approve registrations, control access, extend expiry, and send activation emails.
                    </p>
                </div>

                <button
                    onClick={() => saveAllUsers()}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save All Changes"}
                </button>
            </div>

            {notice && (
                <div className={`rounded-2xl border px-5 py-4 text-sm font-semibold shadow-lg ${
                    notice.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                        : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
                }`}>
                    {notice.message}
                </div>
            )}

            <form
                onSubmit={addUser}
                className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80"
            >
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <Plus size={20} />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-950 dark:text-white">Add Student</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            New users are created as students only. Admin role is locked.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input className="input-box" placeholder="Full name" value={form.name} onChange={event => updateForm("name", event.target.value)} />
                    <input className="input-box" placeholder="Username" value={form.username} onChange={event => updateForm("username", event.target.value)} />
                    <input className="input-box" placeholder="Email address" value={form.email} onChange={event => updateForm("email", event.target.value)} />
                    <input className="input-box" placeholder="Password" value={form.password} onChange={event => updateForm("password", event.target.value)} />

                    <select className="input-box" value={form.status} onChange={event => updateForm("status", event.target.value)}>
                        <option>Inactive</option>
                        <option>Active</option>
                    </select>

                    <input
                        className="input-box"
                        type="date"
                        value={form.expiryDate}
                        disabled={form.status !== "Active"}
                        onChange={event => updateForm("expiryDate", event.target.value)}
                    />

                    <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 xl:col-span-2">
                        <Plus size={18} />
                        Add Student
                    </button>
                </div>
            </form>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-black text-slate-950 dark:text-white">Users Table</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Pending registrations remain student accounts until approved.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search users..."
                                className="input-box pl-10 sm:w-72"
                            />
                        </div>

                        <select className="input-box" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                            <option>All</option>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Pending</option>
                            <option>Expired</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1220px] border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                <th className="table-head">Name</th>
                                <th className="table-head">Username</th>
                                <th className="table-head">Email</th>
                                <th className="table-head">Role</th>
                                <th className="table-head">Status</th>
                                <th className="table-head">Expiry</th>
                                <th className="table-head">Last Login</th>
                                <th className="table-head">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.map(user => {
                                const isAdmin = user.role === "admin";
                                const label = getAccessLabel(user);
                                const isActive = String(user.status).toLowerCase() === "active";
                                const canEmail = !isAdmin && user.email && isActive;

                                return (
                                    <tr key={user.id} className="bg-white dark:bg-slate-900">
                                        <td className="table-cell">
                                            <input className="table-input" value={user.name || ""} onChange={event => updateUser(user.id, "name", event.target.value)} />
                                        </td>

                                        <td className="table-cell">
                                            <input className="table-input" value={user.username || ""} disabled={isAdmin} onChange={event => updateUser(user.id, "username", event.target.value)} />
                                        </td>

                                        <td className="table-cell">
                                            <input className="table-input" value={user.email || ""} onChange={event => updateUser(user.id, "email", event.target.value)} />
                                        </td>

                                        <td className="table-cell">
                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                                                isAdmin
                                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                                    : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                            }`}>
                                                <ShieldCheck size={14} />
                                                {isAdmin ? "Admin" : "Student"}
                                            </span>
                                        </td>

                                        <td className="table-cell">
                                            {isAdmin ? (
                                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                    Active
                                                </span>
                                            ) : (
                                                <select className="table-input" value={user.status || "Inactive"} onChange={event => updateUser(user.id, "status", event.target.value)}>
                                                    <option>Inactive</option>
                                                    <option>Active</option>
                                                </select>
                                            )}

                                            <div className="mt-2 text-xs font-bold text-slate-500">
                                                {label}
                                            </div>
                                        </td>

                                        <td className="table-cell">
                                            <input
                                                className="table-input"
                                                type="date"
                                                value={isAdmin ? "" : user.expiryDate || ""}
                                                disabled={isAdmin || !isActive}
                                                onChange={event => updateUser(user.id, "expiryDate", event.target.value)}
                                            />
                                        </td>

                                        <td className="table-cell text-xs text-slate-500">
                                            {formatDate(user.lastLogin)}
                                        </td>

                                        <td className="table-cell">
                                            <div className="flex flex-wrap gap-2">
                                                {!isAdmin && !isActive && (
                                                    <button type="button" onClick={() => approveAndEmail(user)} disabled={saving || !user.email} className="icon-btn bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40">
                                                        <UserCheck size={15} />
                                                        Approve + Email
                                                    </button>
                                                )}

                                                {!isAdmin && (
                                                    <button type="button" onClick={() => extendUser(user.id)} disabled={saving} className="icon-btn bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40">
                                                        <CalendarPlus size={15} />
                                                        +1 Month
                                                    </button>
                                                )}

                                                {!isAdmin && isActive && (
                                                    <button type="button" onClick={() => setEmailTarget(user)} disabled={!canEmail || saving} className="icon-btn bg-sky-600 hover:bg-sky-700 disabled:opacity-40">
                                                        <Mail size={15} />
                                                        Send Activation
                                                    </button>
                                                )}

                                                {!isAdmin && (
                                                    <button type="button" onClick={() => deleteUser(user.id)} disabled={saving} className="icon-btn bg-rose-600 hover:bg-rose-700 disabled:opacity-40">
                                                        <Trash2 size={15} />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {!filteredUsers.length && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                            No users found.
                        </div>
                    )}
                </div>
            </div>

            {emailTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-950 dark:text-white">
                                        Send Activation Email
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        This will notify the student that their account is active. Their password will not be changed.
                                    </p>
                                    <p className="mt-2 font-bold text-sky-700 dark:text-sky-300">
                                        {emailTarget.email}
                                    </p>
                                </div>
                            </div>

                            <button onClick={() => setEmailTarget(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button onClick={() => setEmailTarget(null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                Cancel
                            </button>

                            <button onClick={confirmSendActivationEmail} disabled={saving} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-60">
                                {saving ? "Sending..." : "Send Activation Email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .input-box {
                    width: 100%;
                    border-radius: 1rem;
                    border: 1px solid rgb(226 232 240);
                    background: white;
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    outline: none;
                }

                .dark .input-box {
                    border-color: rgb(51 65 85);
                    background: rgb(2 6 23);
                    color: white;
                }

                .table-head {
                    border: 1px solid rgb(226 232 240);
                    padding: 0.75rem;
                }

                .dark .table-head {
                    border-color: rgb(30 41 59);
                }

                .table-cell {
                    border: 1px solid rgb(226 232 240);
                    padding: 0.5rem;
                    vertical-align: top;
                }

                .dark .table-cell {
                    border-color: rgb(30 41 59);
                }

                .table-input {
                    width: 100%;
                    border-radius: 0.75rem;
                    border: 1px solid rgb(226 232 240);
                    background: white;
                    padding: 0.6rem 0.75rem;
                    font-size: 0.875rem;
                    outline: none;
                }

                .dark .table-input {
                    border-color: rgb(51 65 85);
                    background: rgb(15 23 42);
                    color: white;
                }

                .icon-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    border-radius: 0.85rem;
                    padding: 0.55rem 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: white;
                    transition: 0.18s ease;
                }
            `}</style>
        </div>
    );
}
