// controllers/user/getUserById.controller.js
const userService = require('../../services/user.service');

const getUserById = async (request, response) => {
    try {
        // Extract userId from params
        const { userId } = request.params;

        // Validate userId present or not
        if (!userId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User ID is required'
            });
        }

        // Get user from service
        const user = await userService.getUserById(userId);

        if (!user) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'User fetched successfully',
            data: {
                userId: user.userId,
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
