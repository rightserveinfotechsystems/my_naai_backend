const adminNotificationService = require("../../services/adminNotification.service");
const { getNotificationByIdValidationSchema } = require("../../validations/adminNotification.validation");

const getNotificationById = async (request, response) => {
    try {
        const { notificationId } = request.params; // use params for GET

        // ✅ Validation
        const validationResult = getNotificationByIdValidationSchema.validate(
            { notificationId },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // ✅ Fetch notification
        const notification = await adminNotificationService.getAdminNotificationById(notificationId);

        if (!notification) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Notification fetched successfully',
            data: notification
        });

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getNotificationById;