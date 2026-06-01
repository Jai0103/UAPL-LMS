import { useMemo, useState } from "react";
import { BookOpenCheck, Eye, Layers, Pencil, Search, Trophy, Users } from "lucide-react";
import { getQuestions, getUsers } from "../lib/storage";
import StatCard from "../components/StatCard";
import PremiumDialog from "../components/PremiumDialog";

export default function Dashboard({ user }) {
  const questions = getQuestions();
  const users = getUsers();
  const [showUsers, setShowUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const filteredUsers = useMemo(() => {
    return users.filter((item) =>
      `${item.name} ${item.username} ${item.role}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <p className="text-xs font-black uppercase tracking-wide text-blue-600">Flight Academy LMS</p>
        <h1 className="mt-2 text-3xl font-black lg:text-5xl">UAPL Theory Command Center</h1>
        <p className="mt-3 max-w-2xl text-slate-500 dark:text-slate-400">
          Premium local learning system for quiz training, flashcard study, course notes, and exam preparation.
        </p>
        <p className="mt-4 text-sm font-bold text-slate-400">Built by: Jairus</p>
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
        title={`Registered Users (${users.length})`}
        message="Local browser accounts only. User changes are stored in localStorage."
        confirmText="Close"
        cancelText="Back"
        onClose={() => {
          setShowUsers(false);
          setSelectedUser(null);
        }}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="input pl-11"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {filteredUsers.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="font-black">{index + 1}. {item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">@{item.username}</p>
                    <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                      {item.role}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn-soft !h-10 !min-h-10 !w-10 !p-0" onClick={() => setSelectedUser(item)}>
                      <Eye size={17} />
                    </button>
                    <button className="btn-soft !h-10 !min-h-10 !w-10 !p-0" onClick={() => window.location.hash = "#/users"}>
                      <Pencil size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedUser && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs font-black uppercase text-blue-600">User Details</p>
              <p className="mt-2 font-black">{selectedUser.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Username: {selectedUser.username}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Role: {selectedUser.role}</p>
            </div>
          )}
        </div>
      </PremiumDialog>
    </div>
  );
}
