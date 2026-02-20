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
            token: deviceToken, // FCM device token
        };

        //🔍 LOG EXACT PAYLOAD
        // console.log("🚀 FCM PAYLOAD SENT:", JSON.stringify(message, null, 2));

        const response = await firebaseAdmin.messaging().send(message);
        console.log("Push Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

module.exports = sendNotificationToDevice;
