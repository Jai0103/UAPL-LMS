import { DEFAULT_QUESTIONS } from "../data/questions";
import { SEED_USERS } from "../data/seedUsers";

const KEYS = {
  users: "uapl_users",
  session: "uapl_session",
  questions: "uapl_questions",
  theme: "uapl_theme",
  quizProgress: "uapl_quiz_progress"
};

export function initStorage() {
  if (!localStorage.getItem(KEYS.users)) {
    localStorage.setItem(KEYS.users, JSON.stringify(SEED_USERS));
  }

  if (!localStorage.getItem(KEYS.questions)) {
    localStorage.setItem(KEYS.questions, JSON.stringify(DEFAULT_QUESTIONS));
  }
}

export function getUsers() {
  return JSON.parse(localStorage.getItem(KEYS.users) || "[]");
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

export function getSession() {
  return JSON.parse(localStorage.getItem(KEYS.session) || "null");
}

export function saveSession(user) {
  localStorage.setItem(KEYS.session, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
}

export function getQuestions() {
  return JSON.parse(localStorage.getItem(KEYS.questions) || "[]");
}

export function saveQuestions(questions) {
  localStorage.setItem(KEYS.questions, JSON.stringify(questions));
}

export function getTheme() {
  return localStorage.getItem(KEYS.theme) || "light";
}

export function saveTheme(theme) {
  localStorage.setItem(KEYS.theme, theme);
}

export function saveQuizProgress(progress) {
  localStorage.setItem(KEYS.quizProgress, JSON.stringify(progress));
}

export function getQuizProgress() {
  return JSON.parse(localStorage.getItem(KEYS.quizProgress) || "null");
}

export function clearQuizProgress() {
  localStorage.removeItem(KEYS.quizProgress);
}
