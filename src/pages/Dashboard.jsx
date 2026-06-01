import { BookOpenCheck, Layers, Trophy, Users } from "lucide-react";
import { getQuestions, getUsers } from "../lib/storage";
import StatCard from "../components/StatCard";

export default function Dashboard({ user }) {
  const questions = getQuestions();
  const users = getUsers();

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="relative">
          <p className="text-xs font-black uppercase text-blue-600">Flight Academy LMS</p>
          <h1 className="mt-2 text-3xl font-black lg:text-5xl">UAPL Theory Command Center</h1>
          <p className="mt-3 max-w-2xl text-slate-500 dark:text-slate-400">
            Study, test, review, and manage training content from a premium browser-only dashboard.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Question Bank" value={questions.length} icon={BookOpenCheck} tone="blue" />
        <StatCard label="Flashcards" value={questions.length} icon={Layers} tone="green" />
        <StatCard label="Users" value={user.role === "admin" ? users.length : "—"} icon={Users} tone="amber" />
        <StatCard label="Mode" value="Local" icon={Trophy} tone="slate" />
      </section>
    </div>
  );
}
