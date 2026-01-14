const { Op } = require('sequelize');
const db = require('../models');

const deleteOldNotifications = async () => {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const deletedCount = await db.Notification.destroy({
            where: {
                createdAt: {
                    [Op.lt]: threeDaysAgo
                }
            }
        });

        console.log(`${deletedCount} old notifications deleted`);
    } catch (error) {
        console.error(' Notification cleanup failed:', error);
    }
};

module.exports = { deleteOldNotifications };
