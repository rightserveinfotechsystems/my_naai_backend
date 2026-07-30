const db = require('../database/models');
const { Op } = require('sequelize');
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

const getUserNotificationCount = async (userId) => {
    return await db.Notification.count({
        where: {
            receiverType: 'USER',
            receiverId: userId,
            isRead: false
        }
    });
};

const getNotificationById = async (notificationId) => {
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


const getNotificationList = async ({ salonId, page = 1, searchString = '' }) => {
    try {
        const limit = DEFAULT_LIMIT;
        const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
        const offset = (safePage - 1) * limit;

        const where = {
            receiverType: 'SALON',
            receiverId: salonId
        };


        // 🔹 Search logic
        if (searchString = searchString?.trim()) {
            const like = `%${searchString}%`;
            where[Op.or] = [
                { title: { [Op.iLike]: like } },
                { message: { [Op.iLike]: like } },
            ];
        }

        const bookingNotifications = await db.Notification.findAll({
            where,
            attributes: [
                ['notification_id', 'id'],
                'title',
                ['message', 'body'],
                'createdAt'
            ]
        });

        const adminWhere = {
            targetType: {
                [Op.in]: ['ALL', 'ALL_SALONS']
            }
        };
        if (searchString?.trim()) {
            const like = `%${searchString}%`;
            adminWhere[Op.or] = [
                { title: { [Op.iLike]: like } },
                { body: { [Op.iLike]: like } }
            ];
        }

        const adminNotifications = await db.AdminNotification.findAll({
            where: adminWhere,
            attributes: [
                'id',
                'title',
                ['body', 'body'],
                'createdAt'
            ]
        });

        const formattedBooking = bookingNotifications.map(n => ({
            ...n.toJSON(),
            type: 'BOOKING'
        }));

        const formattedAdmin = adminNotifications.map(n => ({
            ...n.toJSON(),
            type: 'ADMIN'
        }));

        let merged = [...formattedBooking, ...formattedAdmin];

        merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const totalNotifications = merged.length;
        const paginated = merged.slice(offset, offset + limit);
        const totalPages = Math.ceil(totalNotifications / limit) || 1;
        //  Mark all fetched notifications as read
        // const unreadIds = notifications.filter(n => !n.isRead).map(n => n.notificationId);
        // if (unreadIds.length > 0) {
        //     await db.Notification.update(
        //         { isRead: true },
        //         { where: { notificationId: unreadIds } }
        //     );
        // }

        return {
            notifications: paginated,
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


const geUsertNotificationList = async ({ userId, page = 1, searchString = '' }) => {
    try {
        const limit = DEFAULT_LIMIT;
        const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
        const offset = (safePage - 1) * limit;

        const userWhere  = {
            receiverType: 'USER',
            receiverId: userId
        };


        // 🔹 Search logic
        if ( searchString?.trim()) {
            const like = `%${searchString}%`;
            userWhere [Op.or] = [
                { title: { [Op.iLike]: like } },
                { message: { [Op.iLike]: like } },
            ];
        }

        // const bookingNotifications = await db.Notification.findAll({
        //     where,
        //     attributes: [
        //         ['notification_id', 'id'],
        //         'title',
        //         ['message', 'body'],
        //         'createdAt'
        //     ]
        // });

           const userNotifications = await db.Notification.findAll({
            where: userWhere,
            attributes: [
                ['notification_id', 'id'],
                'title',
                ['message', 'body'],
                'createdAt'
            ]
        });

        const adminWhere = {
            targetType: {
                [Op.in]: ['ALL', 'ALL_USERS']
            }
        };
        if (searchString?.trim()) {
            const like = `%${searchString}%`;
            adminWhere[Op.or] = [
                { title: { [Op.iLike]: like } },
                { body: { [Op.iLike]: like } }
            ];
        }

        const adminNotifications = await db.AdminNotification.findAll({
            where: adminWhere,
            attributes: [
                'id',
                'title',
                ['body', 'body'],
                'createdAt'
            ]
        });

        // MERGE
        const formattedUser = userNotifications.map(n => ({
            ...n.toJSON(),
            type: 'BOOKING'
        }));

        const formattedAdmin = adminNotifications.map(n => ({
            ...n.toJSON(),
            type: 'ADMIN'
        }));

        let merged = [...formattedUser, ...formattedAdmin];

        //sort
        merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        //pagination
        const totalNotifications = merged.length;
        const paginated = merged.slice(offset, offset + limit);
        const totalPages = Math.ceil(totalNotifications / limit) || 1;
        //  Mark all fetched notifications as read
        // const unreadIds = notifications.filter(n => !n.isRead).map(n => n.notificationId);
        // if (unreadIds.length > 0) {
        //     await db.Notification.update(
        //         { isRead: true },
        //         { where: { notificationId: unreadIds } }
        //     );
        // }

        return {
            notifications: paginated,
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
    getNotificationsByIds,
    geUsertNotificationList
};
