const db = require("../database/models");
const { Op } = require("sequelize");
const sendNotificationToDevice = require("../firebase/sendNotification");
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;


const sendAdminNotification = async ({ targetType, title, body, data = {} }) => {
    try {
        let tokens = [];

        if (targetType === "ALL_USERS") {
            const users = await db.User.findAll({
                where: { deviceToken: { [Op.ne]: null } },
                attributes: ["deviceToken"]
            });

            tokens = users.map(u => u.deviceToken);
        }

        else if (targetType === "ALL_SALONS") {
            const salons = await db.DeviceToken.findAll({
                where: { salonId: { [Op.ne]: null }, isActive: true },
                attributes: ["deviceToken"]
            });

            tokens = salons.map(s => s.deviceToken);
        }

        else if (targetType === "ALL") {
            const users = await db.User.findAll({
                where: { deviceToken: { [Op.ne]: null } },
                attributes: ["deviceToken"]
            });

            const salons = await db.DeviceToken.findAll({
                where: { salonId: { [Op.ne]: null }, isActive: true },
                attributes: ["deviceToken"]
            });

            tokens = [
                ...users.map(u => u.deviceToken),
                ...salons.map(s => s.deviceToken)
            ];
        }

        else {
            throw new Error("Invalid targetType");
        }

        // clean tokens
        tokens = [...new Set(tokens.filter(Boolean))];

        if (!tokens.length) {
            return { success: false, message: "No tokens found" };
        }

        console.log(`📢 Sending notification to ${tokens.length} devices`);

        const results = await Promise.allSettled(
            tokens.map(token =>
                sendNotificationToDevice(token, title, body, data)
            )
        );

        const successCount = results.filter(r => r.status === "fulfilled").length;

        if (successCount > 0) {
            await db.AdminNotification.create({
                targetType,
                title,
                body
            });
        }

        return {
            success: true,
            total: tokens.length,
            successCount,
            failedCount: tokens.length - successCount
        };

    } catch (error) {
        console.error("❌ Notification Error:", error);
        throw error;
    }
};

const getAdminNotificationList = async ({ page = 1, searchString = '' }) => {
    try {
        const limit = DEFAULT_LIMIT;
        const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
        const offset = (safePage - 1) * limit;

        const where = {};

        // 🔥 search
        if (searchString && searchString.trim()) {
            const like = `%${searchString.trim()}%`;

            where[Op.or] = [
                { title: { [Op.iLike]: like } },
                { body: { [Op.iLike]: like } },
                // { targetType: { [Op.iLike]: like } }
            ];
        }

        const { count: totalNotifications, rows: notifications } =
            await db.AdminNotification.findAndCountAll({
                where,
                attributes: [
                    'id',
                    'targetType',
                    'title',
                    'body',
                    'createdAt'
                ],
                order: [['createdAt', 'DESC']],
                limit,
                offset,
            });

        const totalPages = Math.ceil(totalNotifications / limit) || 1;

        const result = {
            notifications,
            pagination: {
                page: safePage,
                limit,
                totalNotifications,
                totalPages,
            },
        };

        return result;

    } catch (error) {
        console.error(error);
        throw error;
    }
};

const deleteAdminNotification = async (notificationId) => {
    try {
        const deleted = await db.AdminNotification.destroy({
            where: { id: notificationId }
        });

        // 🔥 destroy returns number (0 or 1)
        if (deleted === 0) {
            return false;
        }
        return true;

    } catch (error) {
        console.error("❌ Delete Notification Error:", error);
        throw error;
    }
};

const getAdminNotificationById = async (notificationId) => {
    try {
        const notification = await db.AdminNotification.findOne({
            where: { id: notificationId, deletedAt: null },
            attributes: ['id', 'targetType', 'title', 'body', 'createdAt']
        });
        return notification;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const getUserAdminNotificationCount = async (userId) => {
    return await db.AdminNotification.count({
        where: {
            isRead: false,
            [Op.or]: [
                { targetType: "ALL" },
                { targetType: "ALL_USERS" }
            ]
        }
    });
};

module.exports = {
    sendAdminNotification,
    getAdminNotificationList,
    deleteAdminNotification,
    getAdminNotificationById,
    getUserAdminNotificationCount
};