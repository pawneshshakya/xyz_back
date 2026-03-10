const { admin } = require("../config/firebase");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");

const sendNotification = async (userId, title, body, data = {}) => {
    try {
        // 1. Save to MongoDB
        await Notification.create({
            userId,
            title,
            body,
            data,
            type: "SYSTEM"
        });

        // 2. Send FCM Push Notification
        if (admin) {
            const user = await User.findById(userId);
            if (user && user.fcm_tokens && user.fcm_tokens.length > 0) {
                const message = {
                    notification: {
                        title: title,
                        body: body,
                    },
                    data: {
                        ...data,
                        type: "SYSTEM"
                    },
                    tokens: user.fcm_tokens,
                };

                const response = await admin.messaging().sendEachForMulticast(message);

                // Optional: Clean up invalid tokens
                if (response.failureCount > 0) {
                    const failedTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            failedTokens.push(user.fcm_tokens[idx]);
                        }
                    });

                    if (failedTokens.length > 0) {
                        user.fcm_tokens = user.fcm_tokens.filter(tok => !failedTokens.includes(tok));
                        await user.save();
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

const sendBroadcast = async (title, body, data = {}) => {
    try {
        // 1. Save to MongoDB
        await Notification.create({
            userId: "ALL",
            title,
            body,
            data,
            type: "ANNOUNCEMENT"
        });

        // 2. Send FCM Broadcast
        if (admin) {
            // Option A: Send to a topic (if you subscribe users to a topic like "all_users" on the frontend)
            const message = {
                notification: {
                    title: title,
                    body: body,
                },
                data: {
                    ...data,
                    type: "ANNOUNCEMENT"
                },
                topic: "all_users"
            };

            await admin.messaging().send(message).catch(err => {
                console.log("Topic send failed (maybe topic doesn't exist yet):", err.message);
            });
        }
    } catch (error) {
        console.error("Error sending broadcast:", error);
    }
};

module.exports = {
    sendNotification,
    sendBroadcast
};
