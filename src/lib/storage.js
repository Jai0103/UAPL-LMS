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
const SYNC_META_KEY = "uapl_lms_sync_meta_v1";

export const DATA_UPDATED_EVENT = "uapl:data-updated";

const DEFAULT_SYNC_MAX_AGE_MS = 60000;

let activeSyncPromise = null;
let activeSyncToken = "";
let activeSyncVersion = 0;
let cacheVersion = 0;

const PRIVATE_DATA_KEYS = [
    USERS_KEY,
    QUIZ_RESULTS_KEY,
    LESSON_PROGRESS_KEY
];

const DATA_KEYS = [
    ...PRIVATE_DATA_KEYS,
    QUESTIONS_KEY,
    FLASHCARDS_KEY,
    COURSE_NOTES_KEY,
    COURSE_LESSONS_KEY
];

function isLegacyPlaceholder(record) {
    return [
        record?.name,
        record?.username,
        record?.question,
        record?.answer,
        record?.explanation
    ].some(value =>
        /motherfather|motherfater|motherfaher/i.test(
            String(value || "")
        )
    );
}

function clearPrivateData() {
    PRIVATE_DATA_KEYS.forEach(key => writeJSON(key, []));
    localStorage.removeItem(SYNC_META_KEY);
    cacheVersion++;
}

function removeLegacyPlaceholders() {
    let repaired = false;

    [
        USERS_KEY,
        QUESTIONS_KEY,
        FLASHCARDS_KEY
    ].forEach(key => {
        const records = readJSON(key, []);

        if (!Array.isArray(records)) return;

        const cleanRecords = records.filter(
            record => !isLegacyPlaceholder(record)
        );

        if (cleanRecords.length !== records.length) {
            writeJSON(key, cleanRecords);
            repaired = true;
        }
    });

    if (isLegacyPlaceholder(readJSON(SESSION_KEY, null))) {
        localStorage.removeItem(SESSION_KEY);
        clearPrivateData();
        repaired = true;
    }

    if (repaired) {
        localStorage.removeItem(SYNC_META_KEY);
    }
}

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

function notifyDataUpdated(source = "local") {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
        new CustomEvent(DATA_UPDATED_EVENT, {
            detail: {
                source,
                updatedAt: new Date().toISOString()
            }
        })
    );
}

function readSyncMeta() {
    const meta = readJSON(SYNC_META_KEY, null);

    return meta && typeof meta === "object"
        ? meta
        : { lastSyncedAt: 0 };
}

function markSynced(session) {
    writeJSON(SYNC_META_KEY, {
        lastSyncedAt: Date.now(),
        userId: String(session.id),
        role: String(session.role || "").toLowerCase()
    });
}

export function hasCachedTrainingData(session = getSession()) {
    if (!session?.id || !session.sessionToken) return false;

    const meta = readSyncMeta();

    return (
        Number(meta.lastSyncedAt) > 0 &&
        String(meta.userId || "") === String(session.id) &&
        String(meta.role || "").toLowerCase() ===
            String(session.role || "").toLowerCase() &&
        DATA_KEYS.every(key =>
            Array.isArray(readJSON(key, null))
        )
    );
}

function shouldUseFreshCache(maxAgeMs) {
    if (!hasCachedTrainingData()) return false;

    const meta = readSyncMeta();
    const lastSyncedAt = Number(meta?.lastSyncedAt || 0);
    const age = Date.now() - lastSyncedAt;

    return age >= 0 && age < maxAgeMs;
}

function refreshInBackground() {
    syncFromCloud({ force: true }).catch(error => {
        console.error("Background sync failed:", error);
    });
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

function normalizeCourseLesson(lesson, index = 0) {
    return {
        id: lesson.id || `lesson-${index + 1}`,
        module:
            lesson.module ||
            lesson.category ||
            "General UAS Knowledge",
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
    removeLegacyPlaceholders();

    DATA_KEYS.forEach(key => {
        if (!Array.isArray(readJSON(key, null))) {
            writeJSON(key, []);
        }
    });

    if (
        !hasCachedTrainingData() &&
        (
            localStorage.getItem(SYNC_META_KEY) ||
            PRIVATE_DATA_KEYS.some(
                key => readJSON(key, []).length
            )
        )
    ) {
        clearPrivateData();
    }
}

export async function syncFromCloud(options = {}) {
    const {
        force = false,
        maxAgeMs = DEFAULT_SYNC_MAX_AGE_MS
    } = options;

    const requestedSession = getSession();

    if (!requestedSession?.sessionToken) {
        throw new Error(
            "Please sign in before loading training data."
        );
    }

    if (!force && shouldUseFreshCache(maxAgeMs)) {
        return {
            success: true,
            cached: true,
            message: "Using recently synced local training data."
        };
    }

    if (
        activeSyncPromise &&
        activeSyncToken === requestedSession.sessionToken &&
        activeSyncVersion === cacheVersion
    ) {
        return activeSyncPromise;
    }

    const requestedCacheVersion = cacheVersion;

    const syncPromise = api.getBootstrap()
        .then(result => {
            if (
                cacheVersion !== requestedCacheVersion ||
                getSession()?.sessionToken !==
                    requestedSession.sessionToken
            ) {
                throw new Error(
                    "Training sync was cancelled because the signed-in account changed."
                );
            }

            if (!result.success) {
                throw new Error(
                    result.message ||
                        "Unable to sync from training database."
                );
            }

            if (result.currentUser) {
                saveSession({
                    ...requestedSession,
                    ...result.currentUser,
                    sessionToken: requestedSession.sessionToken,
                    sessionExpiresAt:
                        requestedSession.sessionExpiresAt
                });
            }

            if (Array.isArray(result.users)) {
                writeJSON(USERS_KEY, result.users);
            }

            if (Array.isArray(result.questions)) {
                writeJSON(
                    QUESTIONS_KEY,
                    result.questions.map(normalizeQuestion)
                );
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
                writeJSON(
                    COURSE_LESSONS_KEY,
                    result.courseLessons.map(normalizeCourseLesson)
                );
            }

            if (Array.isArray(result.lessonProgress)) {
                writeJSON(
                    LESSON_PROGRESS_KEY,
                    result.lessonProgress
                );
            }

            markSynced(getSession());
            notifyDataUpdated("cloud");

            return result;
        })
        .finally(() => {
            if (activeSyncPromise === syncPromise) {
                activeSyncPromise = null;
                activeSyncToken = "";
            }
        });

    activeSyncPromise = syncPromise;
    activeSyncToken = requestedSession.sessionToken;
    activeSyncVersion = requestedCacheVersion;

    return syncPromise;
}

export function getUsers() {
    return readJSON(USERS_KEY, []);
}

export async function saveUsers(users) {
    writeJSON(USERS_KEY, users);
    notifyDataUpdated("local");

    const result = await api.saveUsers(users);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to save users."
        );
    }

    refreshInBackground();

    return result;
}

export function getQuestions() {
    return readJSON(QUESTIONS_KEY, []).map(normalizeQuestion);
}

export async function saveQuestions(questions) {
    const cleanQuestions = questions.map(normalizeQuestion);

    writeJSON(QUESTIONS_KEY, cleanQuestions);
    notifyDataUpdated("local");

    const result = await api.saveQuestions(cleanQuestions);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to save questions."
        );
    }

    refreshInBackground();

    return result;
}

export function getFlashcards() {
    return readJSON(FLASHCARDS_KEY, []);
}

export async function saveFlashcards(flashcards) {
    writeJSON(FLASHCARDS_KEY, flashcards);
    notifyDataUpdated("local");

    const result = await api.saveFlashcards(flashcards);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to save flashcards."
        );
    }

    refreshInBackground();

    return result;
}

export function getCourseNotes() {
    return readJSON(COURSE_NOTES_KEY, []);
}

export async function saveCourseNotes(courseNotes) {
    writeJSON(COURSE_NOTES_KEY, courseNotes);
    notifyDataUpdated("local");

    const result = await api.saveCourseNotes(courseNotes);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to save course notes."
        );
    }

    refreshInBackground();

    return result;
}

export function getCourseLessons() {
    return readJSON(COURSE_LESSONS_KEY, [])
        .map(normalizeCourseLesson)
        .sort(
            (a, b) =>
                Number(a.order || 0) - Number(b.order || 0)
        );
}

export async function saveCourseLessons(courseLessons) {
    const cleanLessons = courseLessons
        .map(normalizeCourseLesson)
        .sort(
            (a, b) =>
                Number(a.order || 0) - Number(b.order || 0)
        );

    writeJSON(COURSE_LESSONS_KEY, cleanLessons);
    notifyDataUpdated("local");

    const result = await api.saveCourseLessons(cleanLessons);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to save learning lessons."
        );
    }

    refreshInBackground();

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
            String(item.username).toLowerCase() ===
                String(localRow.username).toLowerCase()
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
    notifyDataUpdated("local");

    const result = await api.saveLessonProgress({
        lessonId,
        status: localRow.status,
        completedAt: localRow.completedAt
    });

    if (!result.success) {
        throw new Error(
            result.message || "Unable to save lesson progress."
        );
    }

    refreshInBackground();

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

    writeJSON(
        QUIZ_RESULTS_KEY,
        [...localResults, localResult]
    );

    notifyDataUpdated("local");

    const response = await api.submitQuizResult(result);

    if (!response.success) {
        throw new Error(
            response.message || "Unable to save quiz result."
        );
    }

    refreshInBackground();

    return response;
}

export async function approveAndSendActivationEmail(userId) {
    const result = await api.approveAndSendActivationEmail(userId);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to approve account."
        );
    }

    if (result.user) {
        const nextUsers = getUsers().map(user =>
            String(user.id) === String(result.user.id)
                ? result.user
                : user
        );

        writeJSON(USERS_KEY, nextUsers);
        notifyDataUpdated("local");
    }

    refreshInBackground();

    return result;
}

export async function sendLoginEmail(userId) {
    const result = await api.sendLoginEmail(userId);

    if (!result.success) {
        throw new Error(
            result.message || "Unable to send login email."
        );
    }

    if (result.user) {
        const nextUsers = getUsers().map(user =>
            String(user.id) === String(result.user.id)
                ? result.user
                : user
        );

        writeJSON(USERS_KEY, nextUsers);
        notifyDataUpdated("local");
    }

    return result;
}

export async function generateFlashcardsFromQuestions() {
    const result = await api.generateFlashcardsFromQuestions();

    if (!result.success) {
        throw new Error(
            result.message || "Unable to generate flashcards."
        );
    }

    refreshInBackground();

    return result;
}

export function saveSession(session) {
    if (!session) return;

    const previousSession = getSession();

    if (
        String(previousSession?.id || "") !==
            String(session.id || "") ||
        String(previousSession?.role || "").toLowerCase() !==
            String(session.role || "").toLowerCase()
    ) {
        clearPrivateData();
    }

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
    clearPrivateData();
    notifyDataUpdated("local");
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
}

export function clearAllLocalData() {
    cacheVersion++;

    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(QUESTIONS_KEY);
    localStorage.removeItem(FLASHCARDS_KEY);
    localStorage.removeItem(COURSE_NOTES_KEY);
    localStorage.removeItem(QUIZ_RESULTS_KEY);
    localStorage.removeItem(COURSE_LESSONS_KEY);
    localStorage.removeItem(LESSON_PROGRESS_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SYNC_META_KEY);

    notifyDataUpdated("local");
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
        const lessons = backup.courseLessons.map(
            normalizeCourseLesson
        );

        writeJSON(COURSE_LESSONS_KEY, lessons);
        await api.saveCourseLessons(lessons);
    }

    await syncFromCloud();

    return {
        success: true,
        message: "Backup restored successfully."
    };
}
