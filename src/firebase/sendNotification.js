const sendPushNotification = async (token, title, body) => {
    try {
        const message = {
            notification: {
                title: title,
                body: body,
            },
            token: token, // FCM device token
        };

        const response = await admin.messaging().send(message);
        console.log("Successfully sent message:", response);
    } catch (error) {
        console.error("Error sending message:", error);
    }
};
