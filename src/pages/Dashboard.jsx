import { useState } from "react";
import { BookOpenCheck, Layers, Trophy, Users } from "lucide-react";
import { getQuestions, getUsers } from "../lib/storage";
import StatCard from "../components/StatCard";
import PremiumDialog from "../components/PremiumDialog";

export default function Dashboard({ user }) {
  const questions = getQuestions();
  const users = getUsers();
  const [showUsers, setShowUsers] = useState(false);

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <p className="text-xs font-black uppercase text-blue-600">Flight Academy LMS</p>
        <h1 className="mt-2 text-3xl font-black lg:text-5xl">UAPL Theory Command Center</h1>
        <p className="mt-3 max-w-2xl text-slate-500 dark:text-slate-400">
          Study, test, review, and manage training content from a premium browser-only dashboard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Question Bank" value={questions.length} icon={BookOpenCheck} tone="blue" />
        <StatCard label="Flashcards" value={questions.length} icon={Layers} tone="green" />

        <button
          className="!m-0 !h-auto !p-0 text-left"
          onClick={() => user.role === "admin" && setShowUsers(true)}
        >
          <StatCard label="Users" value={user.role === "admin" ? users.length : "—"} icon={Users} tone="amber" />
        </button>

        <StatCard label="Mode" value="Local" icon={Trophy} tone="slate" />
      </section>

      <PremiumDialog
        open={showUsers}
        type="info"
        title="Registered Local Users"
        message="These accounts are stored in this browser using localStorage."
        confirmText="Close"
        cancelText="Back"
        onClose={() => setShowUsers(false)}
      >
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {users.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left dark:border-white/10 dark:bg-white/10">
              <p className="font-black">{item.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Username: {item.username}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Role: {item.role}</p>
            </div>
          ))}
        </div>
      </PremiumDialog>
    </div>
  );
}
