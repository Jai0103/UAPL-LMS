import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    ClipboardList,
    FileText,
    Layers,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Settings,
    Settings2,
    Sun,
    UploadCloud,
    Users,
    X
} from "lucide-react";
import { clearSession } from "../lib/storage";

const navItems = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        label: "Quiz Mode",
        path: "/quiz",
        icon: ClipboardList
    },
    {
        label: "Flashcards",
        path: "/flashcards",
        icon: Layers
    },
    {
        label: "Course Notes",
        path: "/course-notes",
        icon: FileText
    },
    {
        label: "Quiz Manager",
        path: "/quiz-manager",
        icon: Settings2,
        adminOnly: true
    },
    {
        label: "User Management",
        path: "/users",
        icon: Users,
        adminOnly: true
    },
    {
        label: "Import & Backup",
        path: "/import-backup",
        icon: UploadCloud,
        adminOnly: true
    },
    {
        label: "Settings",
        path: "/settings",
        icon: Settings
    }
];

export default function Layout({ session, theme, onThemeToggle, onLogout }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const visibleNavItems = navItems.filter((item) => {
        if (item.adminOnly && session?.role !== "admin") return false;
        return true;
    });

    function handleLogout() {
        const confirmed = window.confirm("Are you sure you want to logout?");

        if (!confirmed) return;

        clearSession();
        onLogout();
        navigate("/login");
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 transition dark:bg-slate-950 dark:text-white">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.14),transparent_30%)]" />

            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed left-4 top-4 z-40 rounded-2xl bg-white/90 p-3 text-slate-800 shadow-lg backdrop-blur-xl dark:bg-slate-900/90 dark:text-white lg:hidden"
                aria-label="Open menu"
            >
                <Menu size={22} />
            </button>

            {sidebarOpen && (
                <button
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close menu overlay"
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 flex h-full w-80 flex-col border-r border-white/20 bg-white/85 p-5 shadow-premium backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-900/85 lg:translate-x-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="mb-7 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-sky-300">
                            AGA
                        </p>
                        <h1 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                            UAPL LMS
                        </h1>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Built by: Jairus
                        </p>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-5 rounded-3xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Signed in as
                    </p>
                    <p className="mt-1 font-black text-slate-900 dark:text-white">
                        {session?.name || "User"}
                    </p>
                    <p className="text-sm capitalize text-slate-500 dark:text-slate-400">
                        {session?.role || "student"}
                    </p>
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                                        isActive
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                                    }`
                                }
                            >
                                <Icon size={19} />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="mt-5 space-y-2">
                    <button
                        onClick={onThemeToggle}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            <main className="relative z-10 min-h-screen px-4 py-6 lg:ml-80 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
