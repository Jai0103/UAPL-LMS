import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpenCheck,
  Layers,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ClipboardList,
  FileText
} from "lucide-react";
import { useState } from "react";
import { clearSession } from "../lib/storage";
import PremiumDialog from "./PremiumDialog";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/quiz", label: "Quiz Mode", icon: BookOpenCheck },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/course-notes", label: "Course Notes", icon: FileText },
  { to: "/quiz-manager", label: "Quiz Manager", icon: ClipboardList, adminOnly: true },
  { to: "/users", label: "User Management", icon: Users, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Layout({ children, user, onLogout, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const location = useLocation();

  function logout() {
    clearSession();
    onLogout();
  }

  const visibleNav = navItems.filter((item) => !item.adminOnly || user.role === "admin");

  return (
    <div className="min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 glass p-4 transition lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">Apollo Global Academy</p>
            <h1 className="text-xl font-black">UAPL Portal</h1>
          </div>
          <button className="btn-soft !w-10 !p-0 lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
                    : "text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <button className="btn-soft w-full" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button className="btn-soft w-full" onClick={() => setConfirmLogout(true)}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-xl dark:bg-[#07111f]/70 dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-4 lg:px-8">
            <button className="btn-soft !w-11 !p-0 lg:hidden" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back</p>
              <h2 className="font-black">{user.name}</h2>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
              {user.role.toUpperCase()}
            </span>
          </div>
        </header>

        <div className="p-4 lg:p-8">{children}</div>
      </main>

      <PremiumDialog
        open={confirmLogout}
        type="warning"
        title="Confirm logout"
        message="Are you sure you want to end your current session?"
        confirmText="Logout"
        cancelText="Stay"
        onConfirm={logout}
        onClose={() => setConfirmLogout(false)}
      />
      
    </div>
  );
}
