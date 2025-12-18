const userService = require('../../services/user.service');
const { userIdValidationSchema } = require('../../validations/user.validation');

const getUserById = async (request, response) => {
  try {
    let userId;
    // Check if admin request
    if (request.admin) {
      userId = request?.body?.userId;
    }

    //if user request
    else if (request.user) {
      userId = request.user?.id;      
    }  


// Validate userId
    const validationResult = await userIdValidationSchema.validate(
      { userId },
      { abortEarly: true }
    );
    if (validationResult.error) {
      return response.status(200).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message,
      });
    }

  // Fetch user by ID
    const user = await userService.getUserById(userId);

    if (!user) {
      return response.status(200).json({
        status: 'FAILED',
        message: 'User not found'
      });
    }

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'User fetched successfully',
      data: {
        userId: user.userId ||user.id,                  
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        isActive: user.isActive,
        isVerified: user.isVerified,
        deviceToken: user.deviceToken,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = getUserById;
