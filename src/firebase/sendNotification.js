const db = require("../database/models");
const firebaseAdmin = require("./firebase");
async function sendNotificationToDevice(deviceToken = null, title, body, data = {}) {
    try {
        if (!deviceToken) {
            return false
        }
        // FCM data payload MUST contain string values only 
        const stringData = Object.entries(data).reduce((acc, [key, value]) => { if (value === null || value === undefined) { acc[key] = ""; } else if (typeof value === "object") { acc[key] = JSON.stringify(value); } else { acc[key] = String(value); } return acc; }, {});
        const message = {
            data: {
                title: title,
                body: body,
                ...stringData,
                name: "MyNaai",
            },
            android: {
                priority: "high",
            },
            token: deviceToken,
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
