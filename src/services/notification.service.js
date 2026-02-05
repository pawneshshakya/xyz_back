const { db } = require("../config/firebase");

const sendNotification = async (userId, title, body, data = {}) => {
    try {
        if (!db) return; // fail silently if not init

        await db.collection("notifications").add({
            userId,
            title,
            body,
            data,
            isRead: false,
            createdAt: new Date(),
            type: "SYSTEM"
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

const sendBroadcast = async (title, body, data = {}) => {
    try {
        if (!db) return;

        // Pattern: Write a single document with userId = 'ALL'
        // Frontend logic must query for userId == 'ALL'
        await db.collection("notifications").add({
            userId: "ALL",
            title,
            body,
            data,
            isRead: false, // Conceptually 'unread' for everyone initially
            createdAt: new Date(),
            type: "ANNOUNCEMENT"
        });
    } catch (error) {
        console.error("Error sending broadcast:", error);
    }
};

module.exports = {
    sendNotification,
    sendBroadcast
};
