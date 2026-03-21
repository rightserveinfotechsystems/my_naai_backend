const adminNotificationService = require('../../services/adminNotification.service');

const NotificationSendByAdmin = async (req, res) => {
  try {
    const { targetType, title, body, data } = req.body;

    // ✅ validation
    if (!targetType || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "targetType, title and body are required"
      });
    }

    // ✅ valid types
    const validTypes = ["ALL_USERS", "ALL_SALONS", "ALL"];
    if (!validTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid targetType.(ALL_USERS, ALL_SALONS, ALL)"
      });
    }

    const result = await adminNotificationService.sendAdminNotification({
      targetType,
      title,
      body,
      data
    });

    return res.json(result);

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = NotificationSendByAdmin;