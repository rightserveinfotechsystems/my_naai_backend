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
// sendNotificationToDevice("fc2A21LpQ4W3IBj7ry6RyW:APA91bHexWAirHUAVKOZKqsl_BSxon1wTcvqhk40qWCWE1YGzQjdd76Q520S-zuX0rUtcNfyux60kk7GdtuNtm6H6f_G60SL4ODvKPTUbx55qBmKWtQVrjI","Test Title","This is test notification body");