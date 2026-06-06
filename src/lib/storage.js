import { DEFAULT_QUESTIONS } from "../data/questions";
import { DEFAULT_USERS } from "../data/seedUsers";
import { api } from "./api";

const USERS_KEY = "uapl_lms_users_v1";
const SESSION_KEY = "uapl_lms_session_v1";
const QUESTIONS_KEY = "uapl_lms_questions_v1";
const FLASHCARDS_KEY = "uapl_lms_flashcards_v1";
const THEME_KEY = "uapl_lms_theme_v1";
const COURSE_NOTES_KEY = "uapl_lms_course_notes_v1";
const QUIZ_RESULTS_KEY = "uapl_lms_quiz_results_v1";

function read(key, fallback) {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function defaultFlashcards() {
    return DEFAULT_QUESTIONS.map((item, index) => ({
        id: `flash-${index + 1}`,
        question: item.question,
        answer: item.options[item.answer],
        explanation: item.explanation,
        status: "Active"
    }));
}

export function initStorage() {
    if (!localStorage.getItem(USERS_KEY)) write(USERS_KEY, DEFAULT_USERS);
    if (!localStorage.getItem(QUESTIONS_KEY)) write(QUESTIONS_KEY, DEFAULT_QUESTIONS);
    if (!localStorage.getItem(FLASHCARDS_KEY)) write(FLASHCARDS_KEY, defaultFlashcards());
    if (!localStorage.getItem(COURSE_NOTES_KEY)) write(COURSE_NOTES_KEY, []);
    if (!localStorage.getItem(QUIZ_RESULTS_KEY)) write(QUIZ_RESULTS_KEY, []);
    if (!localStorage.getItem(THEME_KEY)) localStorage.setItem(THEME_KEY, "light");
}

export async function syncFromCloud() {
    const result = await api.getBootstrap();

    if (!result.success) {
        throw new Error(result.message || "Unable to sync data from Google Sheets.");
    }

    write(USERS_KEY, result.users || []);
    write(QUESTIONS_KEY, result.questions?.length ? result.questions : DEFAULT_QUESTIONS);
    write(FLASHCARDS_KEY, result.flashcards?.length ? result.flashcards : defaultFlashcards());
    write(COURSE_NOTES_KEY, result.courseNotes || []);
    write(QUIZ_RESULTS_KEY, result.quizResults || []);

    return result;
}

export function getUsers() {
    initStorage();
    return read(USERS_KEY, []);
}

export function saveUsers(users) {
    write(USERS_KEY, users);
    api.saveUsers(users).catch(console.error);
}

export function getSession() {
    return read(SESSION_KEY, null);
}

export function saveSession(session) {
    write(SESSION_KEY, session);
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export function getQuestions() {
    initStorage();
    return read(QUESTIONS_KEY, []);
}

export function saveQuestions(questions) {
    write(QUESTIONS_KEY, questions);
    api.saveQuestions(questions).catch(console.error);
}

export function resetQuestions() {
    write(QUESTIONS_KEY, DEFAULT_QUESTIONS);
    api.saveQuestions(DEFAULT_QUESTIONS).catch(console.error);
    return DEFAULT_QUESTIONS;
}

export function getFlashcards() {
    initStorage();
    return read(FLASHCARDS_KEY, []);
}

export function saveFlashcards(flashcards) {
    write(FLASHCARDS_KEY, flashcards);
    api.saveFlashcards(flashcards).catch(console.error);
}

export function getCourseNotes() {
    initStorage();
    return read(COURSE_NOTES_KEY, []);
}

export function saveCourseNotes(notes) {
    write(COURSE_NOTES_KEY, notes);
    api.saveCourseNotes(notes).catch(console.error);
}

export function getQuizResults() {
    initStorage();
    return read(QUIZ_RESULTS_KEY, []);
}

export function submitQuizResult(result) {
    const existing = getQuizResults();
    const next = [...existing, result];

    write(QUIZ_RESULTS_KEY, next);
    api.submitQuizResult(result).catch(console.error);
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

export function exportBackup() {
    return {
        version: "2.0-google-sheets",
        exportedAt: new Date().toISOString(),
        users: getUsers(),
        questions: getQuestions(),
        flashcards: getFlashcards(),
        courseNotes: getCourseNotes(),
        quizResults: getQuizResults(),
        theme: getTheme()
    };
}

export function restoreBackup(data) {
    if (data.users) saveUsers(data.users);
    if (data.questions) saveQuestions(data.questions);
    if (data.flashcards) saveFlashcards(data.flashcards);
    if (data.courseNotes) saveCourseNotes(data.courseNotes);
    if (data.quizResults) write(QUIZ_RESULTS_KEY, data.quizResults);
    if (data.theme) saveTheme(data.theme);
}
