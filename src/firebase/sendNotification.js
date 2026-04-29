const db = require("../database/models");
const firebaseAdmin = require("./firebase");
async function sendNotificationToDevice(deviceToken = null, title, body, data = {}) {
    try {
        if (!deviceToken) {
            return false
        }
        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: {
                ...data,
                name: "MyNaai"
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "default_channel", // Ensure this matches the channel ID created in the app
                    priority: "max", // Set high priority for Android
                    clickAction: "OPEN_ACTIVITY_1",// Ensure this matches the intent filter in the AndroidManifest.xml
                    visibility: "public" // Show notification content on lock screen
                }
            },
            token: deviceToken, // FCM device token
        };

        //🔍 LOG EXACT PAYLOAD
        console.log("🚀 FCM PAYLOAD SENT:", JSON.stringify(message, null, 2));

        const response = await firebaseAdmin.messaging().send(message);
        console.log("Push Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending push notification:", error);
        // 🔥 IMPORTANT CLEANUP
        if (
            error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-argument'
        ) {
            await db.DeviceToken.update(
                { isActive: false },
                { where: { deviceToken } }
            );
            console.log('🧹 INVALID TOKEN DEACTIVATED');
        }
    }
}

module.exports = sendNotificationToDevice;
