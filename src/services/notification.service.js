const db = require('../database/models');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
const getSalonNotificationCount = async (salonId) => {
    return await db.Notification.count({
        where: {
            receiverType: 'SALON',
            receiverId: salonId,
            isRead: false
        }
    });
};

const getNotificationById =   async (notificationId) => {
    return await db.Notification.findOne({
        where: { notificationId }
    });
};

const getNotificationsByIds = async (notificationIds = []) => {
    return await db.Notification.findAll({
        where: {
            notificationId: notificationIds
        },
        order: [['createdAt', 'DESC']]
    });
};


const getNotificationList = async ({ page = 1, searchString = '' }) => {
    try {
        const limit = DEFAULT_LIMIT;
        const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
        const offset = (safePage - 1) * limit;

        const where = {
        };


        // 🔹 Search logic
        if (searchString = searchString?.trim()) {
            const like = `%${searchString}%`;
            where[Op.or] = [
                { title: { [Op.iLike]: like } },
                { message: { [Op.iLike]: like } },
            ];
        }

        const { count: totalNotifications, rows: notifications } = await db.Notification.findAndCountAll({
            where,
            attributes: ['notificationId',  'title', 'message', 'createdAt'
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        const totalPages = Math.ceil(totalNotifications / limit) || 1;
        //  Mark all fetched notifications as read
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.notificationId);
        if (unreadIds.length > 0) {
            await db.Notification.update(
                { isRead: true },
                { where: { notificationId: unreadIds } }
            );
        }

        return {
            notifications,
            pagination: {
                page: safePage,
                limit,
                totalNotifications,
                totalPages,
            },
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
};


const markNotificationAsRead = async (notificationId, salonId) => {
    return await db.Notification.update(
        { isRead: true },
        {
            where: {
                notificationId,
                receiverType: 'SALON',
                receiverId: salonId
            }
        }
    );
};

const deleteNotification = async ({ notificationId, notificationIds }) => {
    try {
        // ✅ Single delete
        if (notificationId) {
            const deleted = await db.Notification.destroy({
                where: { notificationId }
            });
            return deleted; // returns 1 if deleted, 0 if not found
        }

        // ✅ Multiple delete
        if (notificationIds?.length > 0) {
            const deletedCount = await db.Notification.destroy({
                where: { notificationId: notificationIds }
            });
            return deletedCount; // number of deleted notifications
        }

        throw new Error('Notification ID or IDs are required');
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};

module.exports = {
    getSalonNotificationCount,
    getNotificationList,
    markNotificationAsRead,
    deleteNotification,
    getNotificationById,
    getNotificationsByIds
};
