import { useMemo, useState } from "react";
import { Edit3, Plus, Save, Search, Trash2, Users as UsersIcon } from "lucide-react";
import { getUsers, saveUsers } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";

export default function Users() {
    const [users, setUsers] = useState(getUsers());
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState({
        name: "",
        username: "",
        password: "",
        role: "student",
        status: "Active"
    });

    const filteredUsers = useMemo(() => {
        const keyword = search.toLowerCase();
        return users.filter((user) =>
            `${user.name} ${user.username} ${user.role} ${user.status}`
                .toLowerCase()
                .includes(keyword)
        );
    }, [users, search]);

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

    function resetForm() {
        setEditingId(null);
        setForm({
            name: "",
            username: "",
            password: "",
            role: "student",
            status: "Active"
        });
    }

    function saveUser() {
        if (!form.name || !form.username || !form.password) {
            showMessage(
                "warning",
                "Incomplete User Details",
                "Please complete the full name, username, and password before saving this user."
            );
            return;
        }

        const usernameExists = users.some(
            (user) =>
                user.username.toLowerCase() === form.username.toLowerCase() &&
                user.id !== editingId
        );

        if (usernameExists) {
            showMessage(
                "danger",
                "Username Already Exists",
                "Please use a different username. Each login account must have a unique username."
            );
            return;
        }

        const nextUsers = editingId
            ? users.map((user) =>
                  user.id === editingId ? { ...user, ...form } : user
              )
            : [
                  ...users,
                  {
                      id: `user-${Date.now()}`,
                      ...form,
                      createdAt: new Date().toISOString().slice(0, 10)
                  }
              ];

        setUsers(nextUsers);
        saveUsers(nextUsers);
        resetForm();

        showMessage(
            "success",
            editingId ? "User Updated" : "User Created",
            "The user account has been saved successfully in local browser storage."
        );
    }

    function editUser(user) {
        setEditingId(user.id);
        setForm({
            name: user.name || "",
            username: user.username || "",
            password: user.password || "",
            role: user.role || "student",
            status: user.status || "Active"
        });
    }

    function askDeleteUser(user) {
        setDialog({
            type: "danger",
            title: "Delete User?",
            message: `This will permanently remove ${user.name} from this browser's local user list.`,
            confirmText: "Delete User",
            cancelText: "Cancel",
            onConfirm: () => deleteUser(user.id),
            onCancel: closeDialog
        });
    }

    function deleteUser(id) {
        const nextUsers = users.filter((user) => user.id !== id);
        setUsers(nextUsers);
        saveUsers(nextUsers);
        resetForm();

        setDialog({
            type: "success",
            title: "User Deleted",
            message: "The selected user has been removed successfully.",
            confirmText: "Done",
            onConfirm: closeDialog
        });
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                    Admin
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    User Management
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Manage admin and student accounts stored in this browser.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                            {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
                        </div>
                        <h2 className="text-lg font-black dark:text-white">
                            {editingId ? "Edit User" : "Add User"}
                        </h2>
                    </div>

                    <div className="space-y-3">
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Full name"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <input
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            placeholder="Username"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <input
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Password"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />

                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                        </select>

                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        <button
                            onClick={saveUser}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                        >
                            <Save size={18} />
                            Save User
                        </button>

                        {editingId && (
                            <button
                                onClick={resetForm}
                                className="w-full rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 dark:border-slate-700 dark:text-white"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                        <Search size={18} className="text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search users..."
                            className="w-full bg-transparent text-sm outline-none dark:text-white"
                        />
                    </div>

                    <div className="space-y-3">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950 md:flex-row md:items-center md:justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                                        <UsersIcon size={20} />
                                    </div>
                                    <div>
                                        <p className="font-black dark:text-white">{user.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {user.username} • {user.role} • {user.status}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => editUser(user)}
                                        className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => askDeleteUser(user)}
                                        className="rounded-xl bg-red-50 px-4 py-2 text-red-700"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {!filteredUsers.length && (
                            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                                No users found.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
