import { useMemo, useState } from "react";
import {
    CalendarClock,
    Plus,
    Save,
    Search,
    Trash2,
    UserPlus,
    Users as UsersIcon
} from "lucide-react";
import { getUsers, saveUsers } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function defaultExpiryDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
}

const emptyUser = {
    name: "",
    username: "",
    password: "",
    role: "student",
    status: "Active",
    expiryDate: defaultExpiryDate()
};

export default function Users() {
    const [users, setUsers] = useState(getUsers());
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dialog, setDialog] = useState(null);
    const [newUser, setNewUser] = useState(emptyUser);

    const filteredUsers = useMemo(() => {
        const keyword = search.toLowerCase();

        return users.filter((user) => {
            const matchesSearch = `${user.name} ${user.username} ${user.role} ${user.status}`
                .toLowerCase()
                .includes(keyword);

            const matchesStatus =
                statusFilter === "All" || String(user.status) === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [users, search, statusFilter]);

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

    function persist(nextUsers) {
        setUsers(nextUsers);
        saveUsers(nextUsers);
    }

    function updateUserCell(id, field, value) {
        const nextUsers = users.map((user) => {
            if (user.id !== id) return user;

            const updated = { ...user, [field]: value };

            if (field === "role" && value === "admin") {
                updated.expiryDate = "";
            }

            if (field === "role" && value === "student" && !updated.expiryDate) {
                updated.expiryDate = defaultExpiryDate();
            }

            return updated;
        });

        persist(nextUsers);
    }

    function addUser() {
        if (!newUser.name || !newUser.username || !newUser.password) {
            showMessage(
                "warning",
                "Incomplete User Details",
                "Please complete the name, username, and password before adding a user."
            );
            return;
        }

        const usernameExists = users.some(
            (user) => user.username.toLowerCase() === newUser.username.toLowerCase()
        );

        if (usernameExists) {
            showMessage(
                "danger",
                "Username Already Exists",
                "Please choose another username. Each user must have a unique login."
            );
            return;
        }

        const isAdmin = newUser.role === "admin";

        const nextUsers = [
            ...users,
            {
                id: `user-${Date.now()}`,
                ...newUser,
                username: newUser.username.trim().toLowerCase(),
                expiryDate: isAdmin ? "" : newUser.expiryDate,
                createdAt: todayDate(),
                lastLogin: ""
            }
        ];

        persist(nextUsers);
        setNewUser(emptyUser);

        showMessage("success", "User Added", "The user has been created successfully.");
    }

    function extendOneMonth(id) {
        const nextUsers = users.map((user) => {
            if (user.id !== id) return user;
            if (user.role === "admin") return user;

            const currentExpiry = user.expiryDate ? new Date(user.expiryDate) : new Date();
            const today = new Date();
            const baseDate = currentExpiry > today ? currentExpiry : today;

            baseDate.setMonth(baseDate.getMonth() + 1);

            return {
                ...user,
                status: "Active",
                expiryDate: baseDate.toISOString().slice(0, 10)
            };
        });

        persist(nextUsers);

        showMessage(
            "success",
            "Access Extended",
            "The student's access has been extended by 1 month and set to Active."
        );
    }

    function askDeleteUser(user) {
        setDialog({
            type: "danger",
            title: "Delete User?",
            message: `This will permanently remove ${user.name} from the user list.`,
            confirmText: "Delete User",
            cancelText: "Cancel",
            onConfirm: () => deleteUser(user.id),
            onCancel: closeDialog
        });
    }

    function deleteUser(id) {
        const nextUsers = users.filter((user) => user.id !== id);
        persist(nextUsers);

        setDialog({
            type: "success",
            title: "User Deleted",
            message: "The selected user has been removed successfully.",
            confirmText: "Done",
            onConfirm: closeDialog
        });
    }

    function saveAllUsers() {
        saveUsers(users);
        showMessage("success", "Saved", "All user changes have been saved.");
    }

    return (
        <div className="space-y-6">
            <PremiumDialog open={!!dialog} {...dialog} />

            <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600 dark:text-sky-300">
                            Admin
                        </p>
                        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                            User Management
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Student accounts expire after 1 month. 
                        </p>
                    </div>

                    <button
                        onClick={saveAllUsers}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                        <Save size={18} />
                        Save All Changes
                    </button>
                </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-sky-500/10 dark:text-sky-300">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white">
                            Add New User
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Student expiry defaults to 1 month from today.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                    <input
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Full name"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white xl:col-span-2"
                    />

                    <input
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="Username"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <input
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Password"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <select
                        value={newUser.role}
                        onChange={(e) =>
                            setNewUser({
                                ...newUser,
                                role: e.target.value,
                                expiryDate: e.target.value === "admin" ? "" : defaultExpiryDate()
                            })
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>

                    {newUser.role === "student" ? (
                        <input
                            type="date"
                            value={newUser.expiryDate}
                            onChange={(e) => setNewUser({ ...newUser, expiryDate: e.target.value })}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    ) : (
                        <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 dark:border-slate-700">
                            No expiry
                        </div>
                    )}

                    <button
                        onClick={addUser}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Add
                    </button>
                </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-premium dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <UsersIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-950 dark:text-white">
                                Users Table
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {filteredUsers.length} of {users.length} users shown
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="All">All</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                            <Search size={18} className="text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users..."
                                className="w-full bg-transparent text-sm outline-none dark:text-white md:w-72"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[1120px] border-collapse bg-white text-sm dark:bg-slate-950">
                        <thead>
                            <tr className="bg-slate-100 text-left text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                <th className="border px-3 py-3 dark:border-slate-700">#</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Name</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Username</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Password</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Role</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Status</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Created</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Access Until</th>
                                <th className="border px-3 py-3 dark:border-slate-700">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredUsers.map((user, index) => (
                                <tr key={user.id} className="dark:text-white">
                                    <td className="border px-3 py-2 font-bold dark:border-slate-700">
                                        {index + 1}
                                    </td>

                                    <td className="border p-1 dark:border-slate-700">
                                        <input
                                            value={user.name || ""}
                                            onChange={(e) => updateUserCell(user.id, "name", e.target.value)}
                                            className="w-full rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-blue-50 dark:focus:bg-slate-800"
                                        />
                                    </td>

                                    <td className="border p-1 dark:border-slate-700">
                                        <input
                                            value={user.username || ""}
                                            onChange={(e) => updateUserCell(user.id, "username", e.target.value)}
                                            className="w-full rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-blue-50 dark:focus:bg-slate-800"
                                        />
                                    </td>

                                    <td className="border p-1 dark:border-slate-700">
                                        <input
                                            value={user.password || ""}
                                            onChange={(e) => updateUserCell(user.id, "password", e.target.value)}
                                            placeholder="New password"
                                            className="w-full rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-blue-50 dark:focus:bg-slate-800"
                                        />
                                    </td>

                                    <td className="border p-1 dark:border-slate-700">
                                        <select
                                            value={user.role || "student"}
                                            onChange={(e) => updateUserCell(user.id, "role", e.target.value)}
                                            className="w-full rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-blue-50 dark:focus:bg-slate-800"
                                        >
                                            <option value="student">student</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>

                                    <td className="border p-1 dark:border-slate-700">
                                        <select
                                            value={user.status || "Active"}
                                            onChange={(e) => updateUserCell(user.id, "status", e.target.value)}
                                            className="w-full rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-blue-50 dark:focus:bg-slate-800"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </td>

                                    <td className="border px-3 py-2 text-slate-500 dark:border-slate-700">
                                        {user.createdAt || "-"}
                                    </td>

                                    <td className="border p-1 dark:border-slate-700">
                                        {user.role === "admin" ? (
                                            <span className="block px-2 py-2 font-bold text-slate-400">
                                                No expiry
                                            </span>
                                        ) : (
                                            <input
                                                type="date"
                                                value={user.expiryDate || ""}
                                                onChange={(e) => updateUserCell(user.id, "expiryDate", e.target.value)}
                                                className="w-full rounded-lg bg-transparent px-2 py-2 outline-none focus:bg-blue-50 dark:focus:bg-slate-800"
                                            />
                                        )}
                                    </td>

                                    <td className="border p-2 dark:border-slate-700">
                                        <div className="flex gap-2">
                                            {user.role !== "admin" && (
                                                <button
                                                    onClick={() => extendOneMonth(user.id)}
                                                    className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                                                >
                                                    <CalendarClock size={14} />
                                                    +1 Month
                                                </button>
                                            )}

                                            <button
                                                onClick={() => askDeleteUser(user)}
                                                className="rounded-xl bg-red-50 px-3 py-2 text-red-700"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!filteredUsers.length && (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
