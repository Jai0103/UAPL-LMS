import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { getUsers, saveUsers } from "../lib/storage";
import PremiumDialog from "../components/PremiumDialog";
import Toast from "../components/Toast";

export default function Users({ user }) {
  const [users, setUsers] = useState(getUsers());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  if (user.role !== "admin") return <Navigate to="/" replace />;

  function addUser() {
    setUsers([
      ...users,
      {
        id: crypto.randomUUID(),
        name: "New User",
        username: "newuser",
        password: "password123",
        role: "student"
      }
    ]);
  }

  function updateUser(index, field, value) {
    const next = [...users];
    next[index] = { ...next[index], [field]: value };
    setUsers(next);
  }

function deleteUser(index) {
  setPendingDelete(index);
}

function confirmDelete() {
  setUsers(users.filter((_, itemIndex) => itemIndex !== pendingDelete));
  setPendingDelete(null);
  setToast({
    type: "success",
    title: "User removed",
    message: "The local user account has been removed from this browser."
  });
}

function save() {
  saveUsers(users);
  setToast({
    type: "success",
    title: "Users saved",
    message: "User changes have been saved locally."
  });
}
  return (
    <div className="space-y-5">
      <section className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-blue-600">Admin Only</p>
          <h1 className="text-3xl font-black">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Local browser users only. Not secure for real authentication.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={addUser}><Plus size={18} /> Add</button>
          <button className="btn-primary" onClick={save}><Save size={18} /> Save</button>
        </div>
      </section>

      <section className="grid gap-4">
        {users.map((item, index) => (
          <div key={item.id} className="card grid gap-3 md:grid-cols-5">
            <input className="input" value={item.name} onChange={(e) => updateUser(index, "name", e.target.value)} />
            <input className="input" value={item.username} onChange={(e) => updateUser(index, "username", e.target.value)} />
            <input className="input" value={item.password} onChange={(e) => updateUser(index, "password", e.target.value)} />
            <select className="input" value={item.role} onChange={(e) => updateUser(index, "role", e.target.value)}>
              <option value="student">student</option>
              <option value="admin">admin</option>
            </select>
            <button className="btn-soft" onClick={() => deleteUser(index)}><Trash2 size={18} /> Delete</button>
          </div>
        ))}
      </section>

      <PremiumDialog
  open={pendingDelete !== null}
  type="warning"
  title="Delete this user?"
  message="This will remove the user from localStorage on this browser."
  confirmText="Delete User"
  onConfirm={confirmDelete}
  onClose={() => setPendingDelete(null)}
/>

<Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
