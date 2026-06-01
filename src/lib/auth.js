import { getUsers, saveSession } from "./storage";

export function login(username, password) {
  const user = getUsers().find(
    (item) => item.username === username && item.password === password
  );

  if (!user) return null;

  const safeUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role
  };

  saveSession(safeUser);
  return safeUser;
}

export function isAdmin(user) {
  return user?.role === "admin";
}
