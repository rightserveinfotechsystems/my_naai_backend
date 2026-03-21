const db = require("../database/models");
const { Op } = require("sequelize");
const sendNotificationToDevice = require("../firebase/sendNotification");


const sendAdminNotification = async ({ targetType, title, body, data = {} }) => {
    try {
        let tokens = [];

        // ✅ USERS (User table)
        if (targetType === "ALL_USERS" || targetType === "ALL") {
            const users = await db.User.findAll({
                where: {
                    deviceToken: { [Op.ne]: null }
                },
                attributes: ["deviceToken"]
            });

            tokens.push(...users.map(u => u.deviceToken));
        }

        // ✅ SALONS (DeviceToken table)
        if (targetType === "ALL_SALONS" || targetType === "ALL") {
            const salons = await db.DeviceToken.findAll({
                where: {
                    salonId: { [Op.ne]: null },
                    isActive: true
                },
                attributes: ["deviceToken"]
            });

            tokens.push(...salons.map(s => s.deviceToken));
        }

        // 🔥 remove duplicates
        tokens = [...new Set(tokens)];

        if (!tokens.length) {
            return { success: false, message: "No tokens found" };
        }

        // 🔥 LOOP 
        // for (const token of tokens) {
        //   await sendNotificationToDevice(token, title, body, data);
        // }

        await Promise.all(
            tokens.map(token =>
                sendNotificationToDevice(token, title, body, data)
            )
        );

        return {
            success: true,
            message: "Notifications sent",
            total: tokens.length
        };

    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    sendAdminNotification
};