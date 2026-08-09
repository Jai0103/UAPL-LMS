import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarPlus,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Info,
    Loader2,
    Mail,
    Plus,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    UserCheck,
    XCircle
} from "lucide-react";
import {
    DATA_UPDATED_EVENT,
    approveAndSendActivationEmail,
    getUsers,
    saveUsers,
    sendLoginEmail
} from "../lib/storage";

const ROWS_PER_PAGE = 10;
const MAIN_ADMIN_IDS = ["admin-001", "3714a0ef-41a8-454d-b037-38fa591b1345"];

function createId(prefix) {
    if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isAdminIdentity(user) {
    const username = String(user?.username || "").trim().toLowerCase();
    const id = String(user?.id || "").trim();

    return username === "admin" || username === "jairus" || MAIN_ADMIN_IDS.includes(id);
}

function toDateInput(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

    return date.toISOString().slice(0, 10);
}

function addOneMonth(value) {
    let base = value ? new Date(value) : new Date();

    if (Number.isNaN(base.getTime())) {
        base = new Date();
    }

    base.setMonth(base.getMonth() + 1);
    return base.toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return "No expiry";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-SG", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

function isExpired(user) {
    if (isAdminIdentity(user)) return false;
    if (!user.expiryDate) return false;

    const expiry = new Date(user.expiryDate);
    if (Number.isNaN(expiry.getTime())) return false;

    expiry.setHours(23, 59, 59, 999);
    return new Date() > expiry;
}

function normalizeUser(user) {
    const admin = isAdminIdentity(user);
    const createdAt = user.createdAt || new Date().toISOString();

    return {
        ...user,
        id: user.id || createId("user"),
        name: user.name || "",
        username: String(user.username || "").trim().toLowerCase(),
        email: String(user.email || "").trim(),
        role: admin ? "admin" : "student",
        status: admin ? "Active" : user.status || "Inactive",
        expiryDate: admin ? "" : toDateInput(user.expiryDate),
        createdAt,
        lastLogin: user.lastLogin || ""
    };
}

function getAccessLabel(user) {
    if (isAdminIdentity(user)) {
        return {
            label: "Admin access",
            className: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
        };
    }

    if (isExpired(user)) {
        return {
            label: "Expired",
            className: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
        };
    }

    if (String(user.status).toLowerCase() === "active") {
        return {
            label: "Active",
            className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
        };
    }

    return {
        label: "Inactive",
        className: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300"
    };
}

const DIALOG_STYLES = {
    success: {
        icon: CheckCircle2,
        iconBox: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        button: "bg-emerald-600 hover:bg-emerald-700"
    },
    warning: {
        icon: AlertTriangle,
        iconBox: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        button: "bg-amber-600 hover:bg-amber-700"
    },
    error: {
        icon: XCircle,
        iconBox: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        button: "bg-rose-600 hover:bg-rose-700"
    },
    info: {
        icon: Info,
        iconBox: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
        button: "bg-sky-600 hover:bg-sky-700"
    }
};

function PremiumDialog({ dialog, onCancel, onConfirm }) {
    if (!dialog) return null;

    const style = DIALOG_STYLES[dialog.type] || DIALOG_STYLES.info;
    const Icon = dialog.loading ? Loader2 : style.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBox}`}>
                        <Icon className={`h-6 w-6 ${dialog.loading ? "animate-spin" : ""}`} />
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            {dialog.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {dialog.message}
                        </p>
                    </div>
                </div>

                {!dialog.loading && (
                    <div className="mt-6 flex justify-end gap-3">
                        {dialog.cancelText && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                {dialog.cancelText}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-black text-white shadow-lg transition ${style.button}`}
                        >
                            {dialog.confirmText || "OK"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionIconButton({ title, loading, disabled, onClick, children, className }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled || loading}
            onClick={onClick}
            className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-50 ${className}`}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </button>
    );
}

export default function Users() {
    const [users, setUsers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [pendingAction, setPendingAction] = useState("");
    const [dialog, setDialog] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    const [form, setForm] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        status: "Inactive",
        expiryDate: ""
    });

    useEffect(() => {
        let mounted = true;

        function refreshUsersFromCache() {
            return Promise.resolve(getUsers())
                .then(data => {
                    if (!mounted) return;
                    setUsers(Array.isArray(data) ? data.map(normalizeUser) : []);
                });
        }

        refreshUsersFromCache().catch(error => {
            setDialog({
                type: "error",
                title: "Unable to load users",
                message: error.message || "The user records could not be loaded.",
                confirmText: "OK"
            });
        });

        window.addEventListener(DATA_UPDATED_EVENT, refreshUsersFromCache);

        return () => {
            mounted = false;
            window.removeEventListener(DATA_UPDATED_EVENT, refreshUsersFromCache);
        };
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return users.filter(user => {
            const matchesSearch =
                !keyword ||
                String(user.name || "").toLowerCase().includes(keyword) ||
                String(user.username || "").toLowerCase().includes(keyword) ||
                String(user.email || "").toLowerCase().includes(keyword);

            const access = getAccessLabel(user).label.toLowerCase();

            const matchesStatus =
                statusFilter === "all" ||
                access === statusFilter ||
                String(user.status || "").toLowerCase() === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [users, search, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE));
    const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(pageStart, pageStart + ROWS_PER_PAGE);

    function updateForm(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    function closeDialog() {
        if (dialog?.loading) return;
        setDialog(null);
    }

    async function confirmDialog() {
        if (!dialog?.onConfirm) {
            setDialog(null);
            return;
        }

        const action = dialog.onConfirm;
        setDialog(null);
        await action();
    }

    function showMessage(type, title, message) {
        setDialog({
            type,
            title,
            message,
            confirmText: "OK"
        });
    }

    function showConfirm({ type = "info", title, message, confirmText = "Continue" }, onConfirm) {
        setDialog({
            type,
            title,
            message,
            cancelText: "Cancel",
            confirmText,
            onConfirm
        });
    }

    function showLoading(type, title, message) {
        setDialog({
            type,
            title,
            message,
            loading: true
        });
    }

    function sanitizeUsers(rows) {
        return rows.map(item => {
            const user = normalizeUser(item);

            if (!isAdminIdentity(user) && user.status === "Active" && !user.expiryDate) {
                user.expiryDate = addOneMonth(user.createdAt);
            }

            return user;
        });
    }

    function validateUsers(rows) {
        const usernames = rows
            .map(user => String(user.username || "").trim().toLowerCase())
            .filter(Boolean);

        if (usernames.length !== new Set(usernames).size) {
            showMessage("error", "Duplicate username", "Each user must have a unique username.");
            return false;
        }

        const invalidStudent = rows.find(user => {
            if (isAdminIdentity(user)) return false;
            return !user.name || !user.username || !user.email;
        });

        if (invalidStudent) {
            showMessage(
                "warning",
                "Missing user details",
                "Student accounts must have a name, username, and email address."
            );
            return false;
        }

        return true;
    }

    async function saveUserRows(nextUsers, successTitle, successMessage) {
        const cleanUsers = sanitizeUsers(nextUsers);

        if (!validateUsers(cleanUsers)) return false;

        setSaving(true);

        try {
            const result = await saveUsers(cleanUsers);

            if (result?.success === false) {
                throw new Error(result.message || "The users could not be saved.");
            }

            setUsers(cleanUsers.map(({ password, ...user }) => user));
            showMessage("success", successTitle, successMessage || result?.message || "User records saved.");
            return true;
        } catch (error) {
            showMessage("error", "Action failed", error.message || "Please try again.");
            return false;
        } finally {
            setSaving(false);
            setPendingAction("");
        }
    }

    function addUser() {
        const username = form.username.trim().toLowerCase();

        if (!form.name.trim() || !username || !form.email.trim()) {
            showMessage("warning", "Incomplete account", "Please enter the student's name, username, and email.");
            return;
        }

        if (users.some(user => String(user.username).toLowerCase() === username)) {
            showMessage("error", "Username already exists", "Please choose a different username.");
            return;
        }

        const newUser = normalizeUser({
            id: createId("user"),
            name: form.name.trim(),
            username,
            email: form.email.trim(),
            password: form.password,
            role: "student",
            status: form.status,
            expiryDate: form.status === "Active" ? form.expiryDate || addOneMonth(new Date()) : form.expiryDate,
            createdAt: new Date().toISOString(),
            lastLogin: ""
        });

        setUsers(prev => [newUser, ...prev]);
        setForm({
            name: "",
            username: "",
            email: "",
            password: "",
            status: "Inactive",
            expiryDate: ""
        });

        showMessage("info", "User added locally", "Click Save Changes to sync this user to the training database.");
    }

    function updateUser(id, field, value) {
        setUsers(prev =>
            prev.map(user => {
                if (user.id !== id) return user;
                return normalizeUser({ ...user, [field]: value });
            })
        );
    }

    async function saveAllUsers() {
        showLoading("info", "Saving user records", "Syncing the latest user list with the training database...");
        await saveUserRows(users, "Users saved", "The user management table has been updated.");
    }

    function approveAndEmail(user) {
        if (isAdminIdentity(user)) return;

        showConfirm(
            {
                type: "info",
                title: "Approve account and send email?",
                message: `This will activate ${user.name || user.username}, set the student access period, and send the login email.`,
                confirmText: "Approve and Send"
            },
            async () => {
                setPendingAction(`approve-${user.id}`);
                showLoading("info", "Approving account", "Activating access and sending the email. Please wait...");

                try {
                    const result = await approveAndSendActivationEmail(user.id);

                    if (result?.success === false) {
                        throw new Error(result.message || "The activation email could not be sent.");
                    }

                    const nextExpiry =
                        result?.user?.expiryDate ||
                        user.expiryDate ||
                        addOneMonth(user.createdAt || new Date());

                    setUsers(prev =>
                        prev.map(item =>
                            item.id === user.id
                                ? normalizeUser({
                                      ...item,
                                      role: "student",
                                      status: "Active",
                                      expiryDate: nextExpiry
                                  })
                                : item
                        )
                    );

                    showMessage(
                        "success",
                        "Activation email sent",
                        result?.message || "The account has been approved and the login email has been sent."
                    );
                } catch (error) {
                    showMessage("error", "Email not sent", error.message || "Please try again.");
                } finally {
                    setPendingAction("");
                }
            }
        );
    }

    function extendUser(user) {
        if (isAdminIdentity(user)) return;

        const nextExpiry = addOneMonth(user.expiryDate || new Date());

        showConfirm(
            {
                type: "info",
                title: "Extend access?",
                message: `${user.name || user.username}'s access will be extended until ${formatDate(nextExpiry)}.`,
                confirmText: "Extend Access"
            },
            async () => {
                setPendingAction(`extend-${user.id}`);
                showLoading("info", "Extending access", "Updating the student access date...");

                const updatedUsers = users.map(item =>
                    item.id === user.id
                        ? normalizeUser({
                              ...item,
                              status: "Active",
                              expiryDate: nextExpiry
                          })
                        : item
                );

                await saveUserRows(
                    updatedUsers,
                    "Access extended",
                    `${user.name || user.username}'s access is now valid until ${formatDate(nextExpiry)}.`
                );
            }
        );
    }

    function confirmSendActivationEmail(user) {
        showConfirm(
            {
                type: "info",
                title: "Send login email?",
                message: `This will send the portal access email to ${user.email || "the selected user"}.`,
                confirmText: "Send Email"
            },
            async () => {
                setPendingAction(`email-${user.id}`);
                showLoading("info", "Sending email", "Sending the login email. Please wait...");

                try {
                    const result = await sendLoginEmail(user.id);

                    if (result?.success === false) {
                        throw new Error(result.message || "The email could not be sent.");
                    }

                    showMessage(
                        "success",
                        "Email sent",
                        result?.message || "The login email has been sent successfully."
                    );
                } catch (error) {
                    showMessage("error", "Email not sent", error.message || "Please try again.");
                } finally {
                    setPendingAction("");
                }
            }
        );
    }

    function deleteUser(user) {
        if (isAdminIdentity(user)) {
            showMessage("warning", "Admin protected", "The main admin account cannot be deleted.");
            return;
        }

        showConfirm(
            {
                type: "warning",
                title: "Delete user?",
                message: `This will permanently remove ${user.name || user.username} from the user list.`,
                confirmText: "Delete User"
            },
            async () => {
                setPendingAction(`delete-${user.id}`);
                showLoading("warning", "Deleting user", "Removing this account from the training database...");

                const updatedUsers = users.filter(item => item.id !== user.id);

                await saveUserRows(
                    updatedUsers,
                    "User deleted",
                    `${user.name || user.username} has been removed.`
                );
            }
        );
    }

    function isActionLoading(action, userId) {
        return pendingAction === `${action}-${userId}`;
    }

    return (
        <>
            <PremiumDialog dialog={dialog} onCancel={closeDialog} onConfirm={confirmDialog} />

            <div className="space-y-6">
                <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-300">
                                Admin Console
                            </p>
                            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                                User Management
                            </h1>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                Manage student access, expiry dates, activation emails, and account status.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={saveAllUsers}
                            disabled={saving}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-60"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </button>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="grid gap-3 md:grid-cols-6">
                        <input
                            value={form.name}
                            onChange={event => updateForm("name", event.target.value)}
                            placeholder="Full name"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <input
                            value={form.username}
                            onChange={event => updateForm("username", event.target.value)}
                            placeholder="Username"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <input
                            value={form.email}
                            onChange={event => updateForm("email", event.target.value)}
                            placeholder="Email"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <input
                            value={form.password}
                            onChange={event => updateForm("password", event.target.value)}
                            placeholder="Password"
                            type="password"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <select
                            value={form.status}
                            onChange={event => updateForm("status", event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option>Inactive</option>
                            <option>Active</option>
                        </select>

                        <button
                            type="button"
                            onClick={addUser}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                        >
                            <Plus className="h-4 w-4" />
                            Add User
                        </button>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Search name, username, or email"
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={event => setStatusFilter(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="all">All users</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                            <option value="admin access">Admin access</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="min-w-[1120px] w-full border-collapse bg-white text-sm dark:bg-slate-950">
                            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Expiry</th>
                                    <th className="px-4 py-3">Last Login</th>
                                    <th className="w-[220px] min-w-[220px] px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {paginatedUsers.map(user => {
                                    const access = getAccessLabel(user);
                                    const admin = isAdminIdentity(user);

                                    return (
                                        <tr key={user.id} className="align-middle">
                                            <td className="px-4 py-4">
                                                <input
                                                    value={user.name}
                                                    onChange={event => updateUser(user.id, "name", event.target.value)}
                                                    className="w-full rounded-xl border border-transparent bg-transparent px-2 py-2 font-bold text-slate-900 outline-none transition focus:border-sky-300 focus:bg-sky-50 dark:text-white dark:focus:bg-slate-900"
                                                />
                                            </td>

                                            <td className="px-4 py-4">
                                                <input
                                                    value={user.username}
                                                    disabled={admin}
                                                    onChange={event => updateUser(user.id, "username", event.target.value)}
                                                    className="w-full rounded-xl border border-transparent bg-transparent px-2 py-2 font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:bg-sky-50 disabled:opacity-70 dark:text-slate-300 dark:focus:bg-slate-900"
                                                />
                                            </td>

                                            <td className="px-4 py-4">
                                                <input
                                                    value={user.email || ""}
                                                    onChange={event => updateUser(user.id, "email", event.target.value)}
                                                    className="w-full rounded-xl border border-transparent bg-transparent px-2 py-2 font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:bg-sky-50 dark:text-slate-300 dark:focus:bg-slate-900"
                                                />
                                            </td>

                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    {admin && <ShieldCheck className="h-3.5 w-3.5" />}
                                                    {user.role}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    <select
                                                        value={user.status}
                                                        disabled={admin}
                                                        onChange={event => updateUser(user.id, "status", event.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black outline-none disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                    >
                                                        <option>Active</option>
                                                        <option>Inactive</option>
                                                    </select>

                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${access.className}`}>
                                                        {access.label}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                <input
                                                    type="date"
                                                    value={toDateInput(user.expiryDate)}
                                                    disabled={admin}
                                                    onChange={event => updateUser(user.id, "expiryDate", event.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                />
                                            </td>

                                            <td className="px-4 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {formatDate(user.lastLogin)}
                                            </td>

                                            <td className="w-[220px] min-w-[220px] px-4 py-4">
                                                <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                                                    <ActionIconButton
                                                        title="Approve and send email"
                                                        loading={isActionLoading("approve", user.id)}
                                                        disabled={saving || admin}
                                                        onClick={() => approveAndEmail(user)}
                                                        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                                    >
                                                        <UserCheck className="h-4 w-4" />
                                                    </ActionIconButton>

                                                    <ActionIconButton
                                                        title="Extend access by 1 month"
                                                        loading={isActionLoading("extend", user.id)}
                                                        disabled={saving || admin}
                                                        onClick={() => extendUser(user)}
                                                        className="border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300"
                                                    >
                                                        <CalendarPlus className="h-4 w-4" />
                                                    </ActionIconButton>

                                                    <ActionIconButton
                                                        title="Send login email"
                                                        loading={isActionLoading("email", user.id)}
                                                        disabled={saving || !user.email}
                                                        onClick={() => confirmSendActivationEmail(user)}
                                                        className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
                                                    >
                                                        <Mail className="h-4 w-4" />
                                                    </ActionIconButton>

                                                    <ActionIconButton
                                                        title="Delete user"
                                                        loading={isActionLoading("delete", user.id)}
                                                        disabled={saving || admin}
                                                        onClick={() => deleteUser(user)}
                                                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </ActionIconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!paginatedUsers.length && (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Showing {filteredUsers.length ? pageStart + 1 : 0}-
                            {Math.min(pageStart + ROWS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </button>

                            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
