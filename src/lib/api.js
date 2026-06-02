const API_URL = "https://script.google.com/macros/s/AKfycbyXp5-LLlcrTsA-KelLg37qHxGuQ9Q982ew9Tfe5nQ4CCWJISjL9CrWCaH0RBy3eEHT/exec";

async function request(action, payload = {}) {
    const response = await fetch(`${API_URL}?action=${action}`, {
        method: "POST",
        body: JSON.stringify(payload)
    });

    return response.json();
}

export const api = {
    login(username, password) {
        return request("login", { username, password });
    },

    getBootstrap() {
        return request("getBootstrap");
    },

    createUser(user) {
        return request("createUser", user);
    },

    updateUser(user) {
        return request("updateUser", user);
    },

    deleteUser(id) {
        return request("deleteUser", { id });
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
