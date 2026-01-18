const firebaseAdmin = require("./firebase");
async function sendNotificationToDevice(deviceToken = null, title, body) {
    try {
        if (!deviceToken) {
            return false
        }
        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: { name: "MyNaai" },
            token: deviceToken, // FCM device token
        };

        const response = await firebaseAdmin.messaging().send(message);
        console.log("Push Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

module.exports = sendNotificationToDevice;
