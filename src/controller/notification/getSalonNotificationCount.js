const notificationService = require('../../services/notification.service')
const getNotificationCount = async (request, response) => {
    try {
        
        const salonId = request.salon.salonId;

        if (!salonId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Salon Id is required'
            })
        }
        const notification = await notificationService.getSalonNotificationCount(salonId);
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
module.exports = getNotificationCount;