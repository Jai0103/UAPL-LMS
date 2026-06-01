import { DEFAULT_QUESTIONS } from "../data/questions";
import { DEFAULT_USERS } from "../data/seedUsers";

const USERS_KEY = "uapl_lms_users_v1";
const SESSION_KEY = "uapl_lms_session_v1";
const QUESTIONS_KEY = "uapl_lms_questions_v1";
const FLASHCARDS_KEY = "uapl_lms_flashcards_v1";
const THEME_KEY = "uapl_lms_theme_v1";
const COURSE_NOTES_KEY = "uapl_lms_course_notes_v1";

export function initStorage() {
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }

    if (!localStorage.getItem(QUESTIONS_KEY)) {
        localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
    }

    if (!localStorage.getItem(FLASHCARDS_KEY)) {
        localStorage.setItem(
            FLASHCARDS_KEY,
            JSON.stringify(
                DEFAULT_QUESTIONS.map((item, index) => ({
                    id: item.id || `flash-${index + 1}`,
                    question: item.question,
                    answer: item.options?.[item.answer] || "",
                    explanation: item.explanation || ""
                }))
            )
        );
    }

    if (!localStorage.getItem(COURSE_NOTES_KEY)) {
        localStorage.setItem(COURSE_NOTES_KEY, JSON.stringify([]));
    }

    if (!localStorage.getItem(THEME_KEY)) {
        localStorage.setItem(THEME_KEY, "light");
    }
}

export function resetLocalData() {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(QUESTIONS_KEY);
    localStorage.removeItem(FLASHCARDS_KEY);
    localStorage.removeItem(COURSE_NOTES_KEY);
    initStorage();
}

export function getUsers() {
    initStorage();
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
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
    return JSON.parse(localStorage.getItem(QUESTIONS_KEY)) || [];
}

export function saveQuestions(questions) {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

export function resetQuestions() {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
    return DEFAULT_QUESTIONS;
}

export function getFlashcards() {
    initStorage();
    return JSON.parse(localStorage.getItem(FLASHCARDS_KEY)) || [];
}

export function saveFlashcards(flashcards) {
    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(flashcards));
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

export function getCourseNotes() {
    initStorage();
    return JSON.parse(localStorage.getItem(COURSE_NOTES_KEY)) || [];
}

export function saveCourseNotes(notes) {
    localStorage.setItem(COURSE_NOTES_KEY, JSON.stringify(notes));
}

export function exportBackup() {
    return {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        users: getUsers(),
        questions: getQuestions(),
        flashcards: getFlashcards(),
        courseNotes: getCourseNotes(),
        theme: getTheme()
    };
}

export function restoreBackup(data) {
    if (data.users) saveUsers(data.users);
    if (data.questions) saveQuestions(data.questions);
    if (data.flashcards) saveFlashcards(data.flashcards);
    if (data.courseNotes) saveCourseNotes(data.courseNotes);
    if (data.theme) saveTheme(data.theme);
}
