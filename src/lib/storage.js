import { DEFAULT_QUESTIONS } from "../data/questions";
import { DEFAULT_USERS } from "../data/seedUsers";

const USERS_KEY = "uapl_lms_users_v1";
const SESSION_KEY = "uapl_lms_session_v1";
const QUESTIONS_KEY = "uapl_lms_questions_v1";
const THEME_KEY = "uapl_lms_theme_v1";
const COURSE_NOTES_KEY = "uapl_lms_course_notes_v1";

export function initStorage() {
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }

    if (!localStorage.getItem(QUESTIONS_KEY)) {
        localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
    }

    if (!localStorage.getItem(THEME_KEY)) {
        localStorage.setItem(THEME_KEY, "light");
    }

    if (!localStorage.getItem(COURSE_NOTES_KEY)) {
        localStorage.setItem(COURSE_NOTES_KEY, JSON.stringify([]));
    }
}

export function getUsers() {
    initStorage();
    return JSON.parse(localStorage.getItem(USERS_KEY));
}

export function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession() {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
}

export function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export function getQuestions() {
    initStorage();
    return JSON.parse(localStorage.getItem(QUESTIONS_KEY));
}

export function saveQuestions(questions) {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export function resetQuestions() {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
    return DEFAULT_QUESTIONS;
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

export function getCourseNotes() {
    initStorage();
    return JSON.parse(localStorage.getItem(COURSE_NOTES_KEY));
}

export function saveCourseNotes(notes) {
    localStorage.setItem(COURSE_NOTES_KEY, JSON.stringify(notes));
}
