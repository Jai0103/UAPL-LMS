import { useMemo, useState } from "react";
import {
    CalendarPlus,
    Mail,
    Plus,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    UserRound,
    X
} from "lucide-react";
import { getUsers, saveUsers, sendLoginEmail } from "../lib/storage";

function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayIso() {
    return new Date().toISOString();
}

function addOneMonth(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return "";

    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
}

function defaultStudentExpiry() {
    return addOneMonth(new Date());
}

export default function Users() {
    const [users, setUsers] = useState(() => getUsers());
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
        role: "student",
        status: "Active",
        expiryDate: defaultStudentExpiry()
    });

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const keyword = search.toLowerCase();

            const matchesSearch =
                user.name?.toLowerCase().includes(keyword) ||
                user.username?.toLowerCase().includes(keyword) ||
                user.email?.toLowerCase().includes(keyword);

            const matchesStatus =
                statusFilter === "All" ||
                String(user.status).toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [users, search, statusFilter]);

    function showNotice(type, message) {
        setNotice({ type, message });
        setTimeout(() => setNotice(null), 3500);
    }

    function updateForm(field, value) {
        setForm(previous => {
            const next = { ...previous, [field]: value };

            if (field === "role" && value === "admin") {
                next.expiryDate = "";
            }

            if (field === "role" && value === "student" && !next.expiryDate) {
                next.expiryDate = defaultStudentExpiry();
            }

            return next;
        });
    }

    function addUser(event) {
        event.preventDefault();

        if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
            showNotice("error", "Please complete name, username, and password.");
            return;
        }

        if (users.some(user => user.username.toLowerCase() === form.username.trim().toLowerCase())) {
            showNotice("error", "Username already exists.");
            return;
        }

        const createdAt = todayIso();

        const newUser = {
            id: createId(),
            name: form.name.trim(),
            username: form.username.trim().toLowerCase(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            status: form.status,
            expiryDate: form.role === "admin" ? "" : form.expiryDate,
            createdAt,
            lastLogin: ""
        };

        setUsers(previous => [...previous, newUser]);

        setForm({
            name: "",
            username: "",
            email: "",
            password: "",
            role: "student",
            status: "Active",
            expiryDate: defaultStudentExpiry()
        });

        showNotice("success", "User added. Click Save All Changes to sync.");
    }

    function updateUser(id, field, value) {
        setUsers(previous =>
            previous.map(user => {
                if (user.id !== id) return user;

                const next = { ...user, [field]: value };

                if (field === "role" && value === "admin") {
                    next.expiryDate = "";
                    next.status = "Active";
                }

                if (field === "role" && value === "student" && !next.expiryDate) {
                    next.expiryDate = defaultStudentExpiry();
                }

                return next;
            })
        );
    }

    function deleteUser(id) {
        const user = users.find(item => item.id === id);

        if (user?.role === "admin") {
            showNotice("error", "Admin accounts cannot be deleted here.");
            return;
        }

        const confirmed = window.confirm(`Delete ${user?.name || "this user"}?`);
        if (!confirmed) return;

        setUsers(previous => previous.filter(item => item.id !== id));
    }

    function extendUser(id) {
        setUsers(previous =>
            previous.map(user => {
                if (user.id !== id) return user;
                if (String(user.role).toLowerCase() === "admin") return user;

                return {
                    ...user,
                    status: "Active",
                    expiryDate: addOneMonth(user.expiryDate || user.createdAt)
                };
            })
        );
    }

    async function saveAllUsers() {
        try {
            setSaving(true);

            const usersToSave = users.map(user => ({
                ...user,
                expiryDate: String(user.role).toLowerCase() === "admin" ? "" : user.expiryDate
            }));

            const result = await saveUsers(usersToSave);

            if (result?.success === false) {
                showNotice("error", result.message || "Unable to save users.");
                return;
            }

            setUsers(usersToSave.map(({ password, ...user }) => user));
            showNotice("success", "Users saved to training database.");
        } catch (error) {
            showNotice("error", error.message || "Unable to save users.");
        } finally {
            setSaving(false);
        }
    }

    async function confirmSendLoginEmail() {
        if (!emailTarget) return;

        try {
            setSaving(true);

            const result = await sendLoginEmail(emailTarget.id);

            if (!result.success) {
                showNotice("error", result.message || "Unable to send login email.");
                return;
            }

            showNotice("success", "Login email sent. A new temporary password was issued.");
            setEmailTarget(null);
        } catch (error) {
            showNotice("error", error.message || "Unable to send login email.");
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
                        Manage student access, expiry dates, status, email, and login access.
                    </p>
                </div>

                <button
                    onClick={saveAllUsers}
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
                        <h2 className="font-black text-slate-950 dark:text-white">Add New User</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Student access expires automatically after one month unless extended.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input className="input-box" placeholder="Full name" value={form.name} onChange={event => updateForm("name", event.target.value)} />
                    <input className="input-box" placeholder="Username" value={form.username} onChange={event => updateForm("username", event.target.value)} />
                    <input className="input-box" placeholder="Email address" value={form.email} onChange={event => updateForm("email", event.target.value)} />
                    <input className="input-box" placeholder="Password" value={form.password} onChange={event => updateForm("password", event.target.value)} />

                    <select className="input-box" value={form.role} onChange={event => updateForm("role", event.target.value)}>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select className="input-box" value={form.status} onChange={event => updateForm("status", event.target.value)}>
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>

                    <input
                        className="input-box"
                        type="date"
                        value={form.expiryDate}
                        disabled={form.role === "admin"}
                        onChange={event => updateForm("expiryDate", event.target.value)}
                    />

                    <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700">
                        <Plus size={18} />
                        Add User
                    </button>
                </div>
            </form>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-black text-slate-950 dark:text-white">Users Table</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Excel-style view for editing student access.
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
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Name</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Username</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Email</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">New Password</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Role</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Status</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Expiry Date</th>
                                <th className="border border-slate-200 px-3 py-3 dark:border-slate-800">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.map(user => {
                                const isAdmin = String(user.role).toLowerCase() === "admin";
                                const canSendEmail = !isAdmin && user.email && String(user.status).toLowerCase() === "active";

                                return (
                                    <tr key={user.id} className="bg-white dark:bg-slate-900">
                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <input className="table-input" value={user.name || ""} onChange={event => updateUser(user.id, "name", event.target.value)} />
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <input className="table-input" value={user.username || ""} onChange={event => updateUser(user.id, "username", event.target.value.toLowerCase())} />
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <input className="table-input" value={user.email || ""} onChange={event => updateUser(user.id, "email", event.target.value)} />
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <input className="table-input" placeholder="Leave blank to keep" value={user.password || ""} onChange={event => updateUser(user.id, "password", event.target.value)} />
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <select className="table-input" value={user.role || "student"} onChange={event => updateUser(user.id, "role", event.target.value)}>
                                                <option value="student">student</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <select className="table-input" value={user.status || "Active"} disabled={isAdmin} onChange={event => updateUser(user.id, "status", event.target.value)}>
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <input className="table-input" type="date" value={isAdmin ? "" : user.expiryDate || ""} disabled={isAdmin} onChange={event => updateUser(user.id, "expiryDate", event.target.value)} />
                                        </td>

                                        <td className="border border-slate-200 p-2 dark:border-slate-800">
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" onClick={() => extendUser(user.id)} disabled={isAdmin} className="action-btn bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40">
                                                    <CalendarPlus size={14} />
                                                    +1 Month
                                                </button>

                                                <button type="button" onClick={() => setEmailTarget(user)} disabled={!canSendEmail || saving} className="action-btn bg-sky-600 hover:bg-sky-700 disabled:opacity-40">
                                                    <Mail size={14} />
                                                    Send Login Email
                                                </button>

                                                <button type="button" onClick={() => deleteUser(user.id)} disabled={isAdmin} className="action-btn bg-rose-600 hover:bg-rose-700 disabled:opacity-40">
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
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
                                        This will notify the user that their account is active. Their password will not be changed.
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

                            <button onClick={confirmSendLoginEmail} disabled={saving} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-60">
                                {saving ? "Sending..." : "Send Login Email"}
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

                .action-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    border-radius: 0.75rem;
                    padding: 0.55rem 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: white;
                    transition: 0.18s ease;
                }
            `}</style>
        </div>
    );
}
