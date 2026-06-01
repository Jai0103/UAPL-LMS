import { DEFAULT_QUESTIONS } from "../data/questions";
import { DEFAULT_USERS } from "../data/seedUsers";

const USERS_KEY = "uapl_lms_users_v1";
const SESSION_KEY = "uapl_lms_session_v1";
const QUESTIONS_KEY = "uapl_lms_questions_v1";
const THEME_KEY = "uapl_lms_theme_v1";
const COURSE_NOTES_KEY = "uapl_lms_course_notes_v1";

export function getUsers() {
    const saved = localStorage.getItem(USERS_KEY);

    if (!saved) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
    }

    return JSON.parse(saved);
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
    const saved = localStorage.getItem(QUESTIONS_KEY);

    if (!saved) {
        localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
        return DEFAULT_QUESTIONS;
    }

    return JSON.parse(saved);
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
    const saved = localStorage.getItem(COURSE_NOTES_KEY);

    if (!saved) {
        const defaultNotes = [];
        localStorage.setItem(COURSE_NOTES_KEY, JSON.stringify(defaultNotes));
        return defaultNotes;
    }

    return JSON.parse(saved);
}

export function saveCourseNotes(notes) {
    localStorage.setItem(COURSE_NOTES_KEY, JSON.stringify(notes));
}
