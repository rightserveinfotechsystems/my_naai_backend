const adminNotificationService = require('../../services/adminNotification.service');
const { sendNotificationToUserAndSalon } = require('../../validations/adminNotification.validation');

const sendNotificationUserAndSalons = async (request, response) => {
    try {
        const { targetType, title, body, data } = request.body;

        const validationResult = await sendNotificationToUserAndSalon.validate(
            { targetType, title, body, data },
            { abortEarly: true });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            })
        }

        const result = await adminNotificationService.sendAdminNotification({
            targetType,
            title,
            body,
            data
        });
        if (result) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Notification sent successfully'
            });
        } else {
            return response.status(200).json({
                status: 'FAILED',
                message: 'Failed to send notification to all. Please try after some time'
            });
        }
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = sendNotificationUserAndSalons;