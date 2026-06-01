import { Plane } from "lucide-react";
import { useState } from "react";
import { login } from "../lib/auth";
import PremiumDialog from "../components/PremiumDialog";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dialog, setDialog] = useState(null);

  function submit(event) {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setDialog({
        type: "warning",
        title: "Login details required",
        message: "Please enter both username and password to continue."
      });
      return;
    }

    const user = login(username.trim(), password);

    if (!user) {
      setDialog({
        type: "warning",
        title: "Access denied",
        message: "The username or password entered is incorrect."
      });
      return;
    }

    onLogin(user);
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-white shadow-lg">
          <Plane />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Apollo Global Academy</p>
          <h1 className="mt-2 text-3xl font-black">UAPL Training Portal</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Secure local access for quiz and flashcard training.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="off"
          />
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="off"
          />
          <button className="btn-primary w-full">Sign In</button>
        </form>
      </section>

      <PremiumDialog
        open={!!dialog}
        type={dialog?.type}
        title={dialog?.title}
        message={dialog?.message}
        confirmText="OK"
        cancelText="Close"
        onClose={() => setDialog(null)}
      />
    </main>
  );
}
