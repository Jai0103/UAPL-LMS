import { DEFAULT_QUESTIONS } from "../data/questions";
import { DEFAULT_USERS } from "../data/seedUsers";
import { api } from "./api";

const USERS_KEY = "uapl_lms_users_v2";
const QUESTIONS_KEY = "uapl_lms_questions_v2";
const FLASHCARDS_KEY = "uapl_lms_flashcards_v2";
const COURSE_NOTES_KEY = "uapl_lms_course_notes_v2";
const QUIZ_RESULTS_KEY = "uapl_lms_quiz_results_v2";
const COURSE_LESSONS_KEY = "uapl_lms_course_lessons_v1";
const LESSON_PROGRESS_KEY = "uapl_lms_lesson_progress_v1";
const SESSION_KEY = "uapl_lms_session_v3";
const THEME_KEY = "uapl_lms_theme_v1";

function readJSON(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function normalizeQuestion(question, index) {
    return {
        id: question.id || `question-${index + 1}`,
        category: question.category || "General UAS Knowledge",
        question: question.question || "",
        options: question.options || [
            question.optionA || "",
            question.optionB || "",
            question.optionC || "",
            question.optionD || ""
        ],
        answer: Number(question.answer || 0),
        explanation: question.explanation || "",
        status: question.status || "Active"
    };
}

function questionsToFlashcards(questions) {
    return questions.map((question, index) => ({
        id: `flashcard-${question.id || index + 1}`,
        category: question.category || "General UAS Knowledge",
        question: question.question,
        answer: question.options?.[question.answer] || "",
        explanation: question.explanation || "",
        status: "Active"
    }));
}

function normalizeCourseLesson(lesson, index = 0) {
    return {
        id: lesson.id || `lesson-${index + 1}`,
        module: lesson.module || lesson.category || "General UAS Knowledge",
        title: lesson.title || "",
        description: lesson.description || "",
        videoUrl: lesson.videoUrl || "",
        materialUrl: lesson.materialUrl || "",
        duration: lesson.duration || "",
        order: Number(lesson.order || index + 1),
        status: lesson.status || "Active",
        createdAt: lesson.createdAt || new Date().toISOString(),
        updatedAt: lesson.updatedAt || ""
    };
}

export function initStorage() {
    if (!localStorage.getItem(USERS_KEY)) {
        writeJSON(USERS_KEY, DEFAULT_USERS || []);
    }

    if (!localStorage.getItem(QUESTIONS_KEY)) {
        const questions = (DEFAULT_QUESTIONS || []).map(normalizeQuestion);
        writeJSON(QUESTIONS_KEY, questions);
    }

    if (!localStorage.getItem(FLASHCARDS_KEY)) {
        writeJSON(FLASHCARDS_KEY, questionsToFlashcards(getQuestions()));
    }

    if (!localStorage.getItem(COURSE_NOTES_KEY)) {
        writeJSON(COURSE_NOTES_KEY, []);
    }

    if (!localStorage.getItem(QUIZ_RESULTS_KEY)) {
        writeJSON(QUIZ_RESULTS_KEY, []);
    }

    if (!localStorage.getItem(COURSE_LESSONS_KEY)) {
        writeJSON(COURSE_LESSONS_KEY, []);
    }

    if (!localStorage.getItem(LESSON_PROGRESS_KEY)) {
        writeJSON(LESSON_PROGRESS_KEY, []);
    }
}

export async function syncFromCloud() {
    const result = await api.getBootstrap();

    if (!result.success) {
        throw new Error(result.message || "Unable to sync from training database.");
    }

    if (Array.isArray(result.users)) {
        writeJSON(USERS_KEY, result.users);
    }

    if (Array.isArray(result.questions)) {
        writeJSON(QUESTIONS_KEY, result.questions.map(normalizeQuestion));
    }

    if (Array.isArray(result.flashcards)) {
        writeJSON(FLASHCARDS_KEY, result.flashcards);
    }

    if (Array.isArray(result.courseNotes)) {
        writeJSON(COURSE_NOTES_KEY, result.courseNotes);
    }

    if (Array.isArray(result.quizResults)) {
        writeJSON(QUIZ_RESULTS_KEY, result.quizResults);
    }

    if (Array.isArray(result.courseLessons)) {
        writeJSON(COURSE_LESSONS_KEY, result.courseLessons.map(normalizeCourseLesson));
    }

    if (Array.isArray(result.lessonProgress)) {
        writeJSON(LESSON_PROGRESS_KEY, result.lessonProgress);
    }

    if (result.currentUser) {
        const currentSession = getSession();

        if (currentSession) {
            saveSession({
                ...currentSession,
                ...result.currentUser,
                sessionToken: currentSession.sessionToken,
                sessionExpiresAt: currentSession.sessionExpiresAt
            });
        }
    }

    return result;
}

export function getUsers() {
    return readJSON(USERS_KEY, []);
}

export async function saveUsers(users) {
    writeJSON(USERS_KEY, users);

    const result = await api.saveUsers(users);

    if (!result.success) {
        throw new Error(result.message || "Unable to save users.");
    }

    await syncFromCloud();

    return result;
}

export function getQuestions() {
    return readJSON(QUESTIONS_KEY, []).map(normalizeQuestion);
}

export async function saveQuestions(questions) {
    const cleanQuestions = questions.map(normalizeQuestion);

    writeJSON(QUESTIONS_KEY, cleanQuestions);

    const result = await api.saveQuestions(cleanQuestions);

    if (!result.success) {
        throw new Error(result.message || "Unable to save questions.");
    }

    await syncFromCloud();

    return result;
}

export function getFlashcards() {
    return readJSON(FLASHCARDS_KEY, []);
}

export async function saveFlashcards(flashcards) {
    writeJSON(FLASHCARDS_KEY, flashcards);

    const result = await api.saveFlashcards(flashcards);

    if (!result.success) {
        throw new Error(result.message || "Unable to save flashcards.");
    }

    await syncFromCloud();

    return result;
}

export function getCourseNotes() {
    return readJSON(COURSE_NOTES_KEY, []);
}

export async function saveCourseNotes(courseNotes) {
    writeJSON(COURSE_NOTES_KEY, courseNotes);

    const result = await api.saveCourseNotes(courseNotes);

    if (!result.success) {
        throw new Error(result.message || "Unable to save course notes.");
    }

    await syncFromCloud();

    return result;
}

export function getCourseLessons() {
    return readJSON(COURSE_LESSONS_KEY, [])
        .map(normalizeCourseLesson)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export async function saveCourseLessons(courseLessons) {
    const cleanLessons = courseLessons
        .map(normalizeCourseLesson)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    writeJSON(COURSE_LESSONS_KEY, cleanLessons);

    const result = await api.saveCourseLessons(cleanLessons);

    if (!result.success) {
        throw new Error(result.message || "Unable to save learning lessons.");
    }

    await syncFromCloud();

    return result;
}

export function getLessonProgress() {
    return readJSON(LESSON_PROGRESS_KEY, []);
}

export async function saveLessonProgress(progress) {
    const lessonId = progress?.lessonId;

    if (!lessonId) {
        throw new Error("Lesson ID is required.");
    }

    const localProgress = getLessonProgress();
    const session = getSession();
    const now = new Date().toISOString();

    const localRow = {
        id: progress.id || `local-progress-${Date.now()}`,
        userId: session?.id || progress.userId || "",
        username: session?.username || progress.username || "",
        lessonId,
        status: progress.status || "Completed",
        completedAt: progress.completedAt || now,
        updatedAt: now
    };

    const existingIndex = localProgress.findIndex(item =>
        String(item.lessonId) === String(lessonId) &&
        (
            String(item.userId) === String(localRow.userId) ||
            String(item.username).toLowerCase() === String(localRow.username).toLowerCase()
        )
    );

    const nextProgress = [...localProgress];

    if (existingIndex >= 0) {
        nextProgress[existingIndex] = {
            ...nextProgress[existingIndex],
            ...localRow
        };
    } else {
        nextProgress.push(localRow);
    }

    writeJSON(LESSON_PROGRESS_KEY, nextProgress);

    const result = await api.saveLessonProgress({
        lessonId,
        status: localRow.status,
        completedAt: localRow.completedAt
    });

    if (!result.success) {
        throw new Error(result.message || "Unable to save lesson progress.");
    }

    await syncFromCloud();

    return result;
}

export function getQuizResults() {
    return readJSON(QUIZ_RESULTS_KEY, []);
}

export async function submitQuizResult(result) {
    const localResults = getQuizResults();

    const localResult = {
        ...result,
        id: `local-result-${Date.now()}`,
        submittedAt: new Date().toISOString()
    };

    writeJSON(QUIZ_RESULTS_KEY, [...localResults, localResult]);

    const response = await api.submitQuizResult(result);

    if (!response.success) {
        throw new Error(response.message || "Unable to save quiz result.");
    }

    await syncFromCloud();

    return response;
}

export async function approveAndSendActivationEmail(userId) {
    const result = await api.approveAndSendActivationEmail(userId);

    if (!result.success) {
        throw new Error(result.message || "Unable to approve account.");
    }

    await syncFromCloud();

    return result;
}

export async function sendLoginEmail(userId) {
    const result = await api.sendLoginEmail(userId);

    if (!result.success) {
        throw new Error(result.message || "Unable to send login email.");
    }

    return result;
}

export async function generateFlashcardsFromQuestions() {
    const result = await api.generateFlashcardsFromQuestions();

    if (!result.success) {
        throw new Error(result.message || "Unable to generate flashcards.");
    }

    await syncFromCloud();

    return result;
}

export function saveSession(session) {
    if (!session) return;

    writeJSON(SESSION_KEY, {
        id: session.id,
        name: session.name,
        username: session.username,
        email: session.email,
        role: session.role,
        status: session.status,
        expiryDate: session.expiryDate,
        createdAt: session.createdAt,
        lastLogin: session.lastLogin,
        sessionToken: session.sessionToken,
        sessionExpiresAt: session.sessionExpiresAt
    });
}

export function getSession() {
    return readJSON(SESSION_KEY, null);
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

export function clearAllLocalData() {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(QUESTIONS_KEY);
    localStorage.removeItem(FLASHCARDS_KEY);
    localStorage.removeItem(COURSE_NOTES_KEY);
    localStorage.removeItem(QUIZ_RESULTS_KEY);
    localStorage.removeItem(COURSE_LESSONS_KEY);
    localStorage.removeItem(LESSON_PROGRESS_KEY);
    localStorage.removeItem(SESSION_KEY);
}

export function exportBackup() {
    return {
        exportedAt: new Date().toISOString(),
        version: "uapl-lms-backup-v3",
        users: getUsers(),
        questions: getQuestions(),
        flashcards: getFlashcards(),
        courseNotes: getCourseNotes(),
        courseLessons: getCourseLessons(),
        lessonProgress: getLessonProgress(),
        quizResults: getQuizResults()
    };
}

export async function restoreBackup(backup) {
    if (!backup || typeof backup !== "object") {
        throw new Error("Invalid backup file.");
    }

    if (Array.isArray(backup.users)) {
        writeJSON(USERS_KEY, backup.users);
        await api.saveUsers(backup.users);
    }

    if (Array.isArray(backup.questions)) {
        const questions = backup.questions.map(normalizeQuestion);
        writeJSON(QUESTIONS_KEY, questions);
        await api.saveQuestions(questions);
    }

    if (Array.isArray(backup.flashcards)) {
        writeJSON(FLASHCARDS_KEY, backup.flashcards);
        await api.saveFlashcards(backup.flashcards);
    }

    if (Array.isArray(backup.courseNotes)) {
        writeJSON(COURSE_NOTES_KEY, backup.courseNotes);
        await api.saveCourseNotes(backup.courseNotes);
    }

    if (Array.isArray(backup.courseLessons)) {
        const lessons = backup.courseLessons.map(normalizeCourseLesson);
        writeJSON(COURSE_LESSONS_KEY, lessons);
        await api.saveCourseLessons(lessons);
    }

    await syncFromCloud();

    return {
        success: true,
        message: "Backup restored successfully."
    };
}
