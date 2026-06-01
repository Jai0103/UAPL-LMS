import { Moon, Sun } from "lucide-react";

export default function Settings({ theme, toggleTheme }) {
  return (
    <section className="card max-w-2xl">
      <p className="text-xs font-black uppercase text-blue-600">Preferences</p>
      <h1 className="mt-2 text-3xl font-black">Settings</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">Adjust local interface preferences.</p>

      <button className="btn-primary mt-6" onClick={toggleTheme}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        Switch to {theme === "dark" ? "Light" : "Dark"} Mode
      </button>
    </section>
  );
}
