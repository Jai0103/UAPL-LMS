const API_URL = "https://script.google.com/macros/s/AKfycby9nTg_xpbZjvxZiU1IbuLaFC_iuo7CCF7SxiBkd0HSJTBkGndZbo5HFYsH0JQshXTG/exec";

const SESSION_KEY = "uapl_lms_session_v3";

function getStoredSessionToken() {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) return "";

        const session = JSON.parse(saved);
        return session?.sessionToken || "";
    } catch {
        return "";
    }
}

async function request(action, payload = {}, options = {}) {
    const body = new URLSearchParams();

    const shouldAttachToken = options.attachToken !== false;
    const sessionToken = shouldAttachToken ? getStoredSessionToken() : "";

    body.append("action", action);
    body.append(
        "payload",
        JSON.stringify({
            ...payload,
            sessionToken
        })
    );

    const response = await fetch(API_URL, {
        method: "POST",
        body
    });

    if (!response.ok) {
        throw new Error("Unable to connect to the training database.");
    }

    const result = await response.json();

    if (
        result &&
        result.success === false &&
        String(result.message || "").toLowerCase().includes("session")
    ) {
        localStorage.removeItem(SESSION_KEY);
    }

    return result;
}

export const api = {
    login: (username, password) =>
        request("login", { username, password }, { attachToken: false }),

    registerUser: data =>
        request("registerUser", data, { attachToken: false }),

    requestPasswordReset: identity =>
        request("requestPasswordReset", { identity }, { attachToken: false }),

    getBootstrap: () =>
        request("getBootstrap"),

    saveUsers: users =>
        request("saveUsers", { users }),

    saveQuestions: questions =>
        request("saveQuestions", { questions }),

    saveFlashcards: flashcards =>
        request("saveFlashcards", { flashcards }),

    saveCourseNotes: courseNotes =>
        request("saveCourseNotes", { courseNotes }),

    saveCourseLessons: courseLessons =>
        request("saveCourseLessons", { courseLessons }),

    saveLessonProgress: progress =>
        request("saveLessonProgress", progress),

    submitQuizResult: result =>
        request("submitQuizResult", result),

    sendLoginEmail: userId =>
        request("sendLoginEmail", { userId }),

    approveAndSendActivationEmail: userId =>
        request("approveAndSendActivationEmail", { userId }),

    generateFlashcardsFromQuestions: () =>
        request("generateFlashcardsFromQuestions")
};
