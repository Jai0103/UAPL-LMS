import { Plane } from "lucide-react";
import { useState } from "react";
import { login } from "../lib/auth";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const user = login(username, password);

    if (!user) {
      setError("Invalid username or password.");
      return;
    }

    onLogin(user);
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white">
          <Plane />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-black uppercase text-blue-600">Apollo Global Academy</p>
          <h1 className="mt-2 text-3xl font-black">UAPL Training Portal</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Premium mock test and flashcard dashboard</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <button className="btn-primary w-full">Sign In</button>
        </form>
      </section>
    </main>
  );
}
