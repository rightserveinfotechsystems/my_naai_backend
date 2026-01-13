const notificationService = require('../../services/notification.service');

const getSalonNotifications = async (request, response) => {
    try {
        const salonId = request.salon.SalonId;

        const { page, searchString } = request.body || {};

        const notifications = await notificationService.getNotificationList({salonId, page, searchString});
        if (notifications.length === 0) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'No notifications found',
                data: []
            });
        } else {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Notifications fetched successfully',
                data: notifications
            });
        }

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getSalonNotifications;
