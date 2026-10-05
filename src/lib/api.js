const API_URL =
    "https://script.google.com/macros/s/AKfycby9nTg_xpbZjvxZiU1IbuLaFC_iuo7CCF7SxiBkd0HSJTBkGndZbo5HFYsH0JQshXTG/exec";

const SESSION_KEY = "uapl_lms_session_v3";
const REQUEST_TIMEOUT_MS = 25000;

const RETRYABLE_ACTIONS = new Set([
    "login",
    "getBootstrap",
    "validateSessionStatus"
]);

class RequestError extends Error {
    constructor(message, code, retryable = false, status = 0) {
        super(message);
        this.name = "RequestError";
        this.code = code;
        this.retryable = retryable;
        this.status = status;
    }
}

function cancelledRequest() {
    return new RequestError(
        "The request was cancelled.",
        "CANCELLED"
    );
}

function waitBeforeRetry(delayMs, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(cancelledRequest());
            return;
        }

        function cancel() {
            clearTimeout(timer);
            signal?.removeEventListener("abort", cancel);
            reject(cancelledRequest());
        }

        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", cancel);
            resolve();
        }, delayMs);

        signal?.addEventListener("abort", cancel, {
            once: true
        });
    });
}

function httpError(response) {
    const status = response.status;

    if (status === 429) {
        const error = new RequestError(
            "The training service is busy. Please wait a moment and try again.",
            "SERVICE_BUSY",
            true,
            status
        );

        const retryAfter = response.headers.get("Retry-After");

        if (retryAfter) {
            const seconds = Number(retryAfter);

            const delay = Number.isFinite(seconds)
                ? seconds * 1000
                : Date.parse(retryAfter) - Date.now();

            if (Number.isFinite(delay)) {
                error.retryAfterMs = Math.max(0, delay);
            }
        }

        return error;
    }

    if (status === 401 || status === 403) {
        return new RequestError(
            "The training service denied access. Please ask the administrator to check the web app deployment permissions.",
            "SERVICE_ACCESS_DENIED",
            false,
            status
        );
    }

    if (status === 404 || status === 410) {
        return new RequestError(
            "The training service could not be found. Please ask the administrator to check the API deployment URL.",
            "SERVICE_NOT_FOUND",
            false,
            status
        );
    }

    return new RequestError(
        status >= 500
            ? "The training service is temporarily unavailable. Please try again shortly."
            : `The training service could not complete the request (HTTP ${status}). Please try again.`,
        "HTTP_ERROR",
        status >= 500 || status === 408,
        status
    );
}

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
    const shouldAttachToken = options.attachToken !== false;

    const sessionToken = shouldAttachToken
        ? getStoredSessionToken()
        : "";

    const maxAttempts = RETRYABLE_ACTIONS.has(action) ? 2 : 1;
    const body = new URLSearchParams();

    body.append("action", action);

    body.append(
        "payload",
        JSON.stringify({
            ...payload,
            sessionToken
        })
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (options.signal?.aborted) {
            throw cancelledRequest();
        }

        if (
            typeof navigator !== "undefined" &&
            navigator.onLine === false
        ) {
            throw new RequestError(
                "You appear to be offline. Reconnect to the internet and try again.",
                "OFFLINE"
            );
        }

        if (
            shouldAttachToken &&
            getStoredSessionToken() !== sessionToken
        ) {
            throw new RequestError(
                "Your session has changed. Please try again.",
                "SESSION_CHANGED"
            );
        }

        try {
            return await fetchAttempt(body, options);
        } catch (error) {
            const retryAfterMs = error.retryAfterMs || 0;

            if (
                !error.retryable ||
                attempt === maxAttempts ||
                retryAfterMs > 3000 ||
                options.signal?.aborted
            ) {
                throw error;
            }

            const delayMs = Math.max(
                800 + Math.floor(Math.random() * 400),
                retryAfterMs
            );

            options.onRetry?.({
                attempt: attempt + 1,
                maxAttempts
            });

            await waitBeforeRetry(delayMs, options.signal);
        }
    }
}

async function fetchAttempt(body, options) {
    const controller = new AbortController();
    let timedOut = false;

    function cancel() {
        controller.abort();
    }

    if (options.signal?.aborted) {
        throw cancelledRequest();
    }

    options.signal?.addEventListener("abort", cancel, {
        once: true
    });

    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, options.timeoutMs || REQUEST_TIMEOUT_MS);

    try {
        // Form encoding avoids a CORS preflight; Apps Script redirects its JSON response.
        const response = await fetch(API_URL, {
            method: "POST",
            body,
            redirect: "follow",
            signal: controller.signal
        });

        if (!response.ok) {
            throw httpError(response);
        }

        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch {
            throw new RequestError(
                "The training service returned an unexpected response. Please ask the administrator to check the web app deployment.",
                "INVALID_RESPONSE"
            );
        }

        if (
            !result ||
            typeof result.success !== "boolean"
        ) {
            throw new RequestError(
                "The training service returned an invalid response. Please contact the administrator.",
                "INVALID_RESPONSE"
            );
        }

        return result;
    } catch (error) {
        if (options.signal?.aborted) {
            throw cancelledRequest();
        }

        if (timedOut) {
            throw new RequestError(
                "The training service took too long to respond. Please try again.",
                "TIMEOUT",
                true
            );
        }

        if (error instanceof RequestError) {
            throw error;
        }

        throw new RequestError(
            "Unable to reach the training service. Check your connection and try again. If it continues, contact the administrator.",
            "NETWORK_ERROR",
            true
        );
    } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", cancel);
    }
}

export const api = {
    login: (username, password, options = {}) =>
        request(
            "login",
            { username, password },
            {
                ...options,
                attachToken: false
            }
        ),

    registerUser: data =>
        request(
            "registerUser",
            data,
            { attachToken: false }
        ),

    requestPasswordReset: identity =>
        request(
            "requestPasswordReset",
            { identity },
            { attachToken: false }
        ),

    getBootstrap: (options = {}) =>
        request("getBootstrap", {}, options),

    validateSessionStatus: (options = {}) =>
        request("validateSessionStatus", {}, options),

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
