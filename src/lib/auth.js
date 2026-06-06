import { api } from "./api";
import { saveSession, syncFromCloud } from "./storage";

export async function authenticateUser(username, password) {
    const result = await api.login(username.trim(), password);

    if (!result.success) {
        return {
            success: false,
            message: result.message || "Invalid username or password."
        };
    }

    saveSession(result.user);

    try {
        await syncFromCloud();
    } catch {
        // Login still works even if sync fails temporarily.
    }

    return {
        success: true,
        user: result.user
    };
}
