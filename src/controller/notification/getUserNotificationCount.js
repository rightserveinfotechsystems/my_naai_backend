const notificationService = require('../../services/notification.service')
const getUserNotificationCount = async (request, response) => {
    try {
       const userId = request.user.id;

    
        const notification = await notificationService.getUserNotificationCount(userId);
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
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    };
};
module.exports = getUserNotificationCount;