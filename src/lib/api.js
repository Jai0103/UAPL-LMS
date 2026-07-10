const API_URL = "https://script.google.com/macros/s/AKfycby9nTg_xpbZjvxZiU1IbuLaFC_iuo7CCF7SxiBkd0HSJTBkGndZbo5HFYsH0JQshXTG/exec";

async function request(action, payload = {}) {
    const body = new URLSearchParams();
    body.append("action", action);
    body.append("payload", JSON.stringify(payload));

    const response = await fetch(API_URL, {
        method: "POST",
        body
    });

    if (!response.ok) {
        throw new Error("Unable to connect to the training database.");
    }

    return response.json();
}

export const api = {
    login: (username, password) => request("login", { username, password }),
    getBootstrap: () => request("getBootstrap"),
    saveUsers: users => request("saveUsers", { users }),
    saveQuestions: questions => request("saveQuestions", { questions }),
    saveFlashcards: flashcards => request("saveFlashcards", { flashcards }),
    saveCourseNotes: courseNotes => request("saveCourseNotes", { courseNotes }),
    submitQuizResult: result => request("submitQuizResult", result),
    sendLoginEmail: userId => request("sendLoginEmail", { userId }),
    approveAndSendActivationEmail: userId =>
    request("approveAndSendActivationEmail", { userId }),
    registerUser: data => request("registerUser", data),
    requestPasswordReset: identity => request("requestPasswordReset", { identity })
};
