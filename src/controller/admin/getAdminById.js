const adminService = require('../../services/admin.service');
const { userIdValidationSchema } = require('../../validations/admin.validation');

const getAdminById = async (request, response) => {
  try {
    let userId;

    // ✅ FROM URL PARAMS (for admin panel)
    if (request.params?.userId) {
      userId = request.params.userId;
    }

    // ✅ FROM TOKEN (for logged-in user)
    else if (request.user) {
      userId = request.user.id;
    }

    // Validate userId
    const { error } = userIdValidationSchema.validate(
      { userId },
      { abortEarly: true }
    );

    if (error) {
      return response.status(400).json({
        status: 'FAILED',
        message: error.details[0].message,
      });
    }

    // Fetch user
    const user = await adminService.getAdminById(userId);

    if (!user) {
      return response.status(404).json({
        status: 'FAILED',
        message: 'User not found',
      });
    }

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'User fetched successfully',
      data: {
        userId: user.userId || user.id,
        mobile: user.mobile,
        name: user.name,
        email: user.email,
        accessTab: user.accessTab,
        isActive: user.isActive,
        isVerified: user.isVerified,
        deviceToken: user.deviceToken,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message,
    });
  }
};

module.exports = getAdminById;
