const notificationService = require('../../services/notification.service');

const deleteNotifications = async (request, response) => {
  try {
    const salonId = request.salon?.salonId;
    const { notificationId, notificationIds } = request.body || {};

    // Salon validation
    if (!salonId) {
      return response.status(401).json({
        status: 'FAILED',
        message: 'Salon Id not found in token',
      });
    }

    //  ID validation
    if (!notificationId && !notificationIds?.length) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'NotificationId or NotificationIds is required',
      });
    }


    const deletedCount = await notificationService.deleteNotification({
      notificationId,
      notificationIds
    });

    if (deletedCount > 0) {
      return response.status(200).json({
        status: 'SUCCESS',
        message: `${deletedCount} notification(s) deleted successfully`,
      });
    }

    return response.status(404).json({
      status: 'FAILED',
      message: 'Notification not found',
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return response.status(500).json({
      status: 'FAILED',
      message: error.message,
    });
  }
};

module.exports = deleteNotifications;
