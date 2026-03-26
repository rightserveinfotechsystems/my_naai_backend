const adminNotificationService = require('../../services/adminNotification.service');
const { sendNotificationToUserAndSalon } = require('../../validations/adminNotification.validation');

const sendNotificationUserAndSalons = async (request, response) => {
    try {
        const { targetType, title, body, data } = request.body;

        const validationResult = sendNotificationToUserAndSalon.validate(
            { targetType, title, body, data },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const result = await adminNotificationService.sendAdminNotification({
            targetType,
            title,
            body,
            data
        });

        if (result.success) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Notification sent successfully',
                data: result
            });
        } else {
            return response.status(200).json({
                status: 'FAILED',
                message: result.message || 'Failed to send notification',
                data: result
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