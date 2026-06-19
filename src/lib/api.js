const API_URL = "https://script.google.com/macros/s/AKfycby9nTg_xpbZjvxZiU1IbuLaFC_iuo7CCF7SxiBkd0HSJTBkGndZbo5HFYsH0JQshXTG/exec";

async function request(action, payload = {}) {
    const body = new URLSearchParams();
    body.append("action", action);
    body.append("payload", JSON.stringify(payload));

    const response = await fetch(API_URL, {
        method: "POST",
        body
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.message || "Google Sheets API request failed.");
    }

    return result;
}

export const api = {
    login(username, password) {
        return request("login", { username, password });
    },

    getBootstrap() {
        return request("getBootstrap");
    },

    saveUsers(users) {
        return request("saveUsers", { users });
    },

    saveQuestions(questions) {
        return request("saveQuestions", { questions });
    },

    saveFlashcards(flashcards) {
        return request("saveFlashcards", { flashcards });
    },

    saveCourseNotes(courseNotes) {
        return request("saveCourseNotes", { courseNotes });
    },

    submitQuizResult(result) {
        return request("submitQuizResult", result);
    }
};
