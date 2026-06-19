export async function saveUsers(users) {
    write(USERS_KEY, users);

    try {
        await api.saveUsers(users);
        console.log("Users synced to Google Sheets.");
    } catch (error) {
        console.error("Failed to sync users:", error);
        alert("User was saved in this browser, but failed to sync to Google Sheets. Please check Apps Script deployment.");
    }
}
