const adminNotificationService = require('../../services/adminNotification.service');

const getUserAdminNotificationCount = async (request, response) => {
    try {
        const userId = request.user?.id;

        if (!userId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User Id is required'
            })
        }
        const notification = await adminNotificationService.getUserAdminNotificationCount(userId);
        if (notification) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Notifcation count fetched successfully',
                notification
            });
        } else {
            return response.status(200).json({
                status: 'FAILED',
                message: 'Notification is not available.'
            });
        }
    }
    catch (error) {
        console.error('Error fetching salon notification count:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    };
};
module.exports = getUserAdminNotificationCount;