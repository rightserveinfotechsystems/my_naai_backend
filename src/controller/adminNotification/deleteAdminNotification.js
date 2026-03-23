const adminNotificationService = require('../../services/adminNotification.service');
const { deleteNotificationIdValidationSchema } = require('../../validations/adminNotification.validation');

const deleteAdminNotification = async (request, response) => {
    try {
        const adminId = request?.admin?.id;

        // admin validation
        if (!adminId) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Admin Id not found in token',
            });
        }

        const { notificationId } = request.body;
        const validationResult = deleteNotificationIdValidationSchema.validate(
            { notificationId },
            { abortEarly: true }
        );
        if (validationResult.error) {
            return response.status(404).json({
                status: 'SUCCESS',
                message: validationResult.error.details[0].message
            })
        };


        const deletedNotification = await adminNotificationService.deleteAdminNotification(notificationId);

        if (deletedNotification) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Notification deleted succesfully',
            });
        } else {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Notification not found',
            });
        }

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message,
        });
    }
};

module.exports = deleteAdminNotification;
