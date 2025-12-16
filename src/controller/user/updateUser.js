// controllers/user/updateUser.controller.js
const { updateUserValidationSchema } = require('../../validations/user.validation');
const userService = require('../../services/user.service');

const updateUser = async (request, response) => {
    try {
        // Extract userId from params
        const { userId } = request.params;
        const { phoneNumber, fullName, email, profileImageUrl, deviceToken } = request.body;

        // Validate input
        const validationResult = updateUserValidationSchema.validate(
            {
                phoneNumber: phoneNumber?.toString(),
                fullName,
                email,
                profileImageUrl,
                deviceToken
            },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;

        // Find existing user
        const existingUser = await userService.getUserById(userId);
        if (!existingUser) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        // Check if phone already exists (different user)
        if (validData.phoneNumber && validData.phoneNumber !== existingUser.phoneNumber) {
            const userByPhone = await userService.getUserByPhone(validData.phoneNumber);
            if (userByPhone) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: 'User already exists with this phone number'
                });
            }
        }

        // Check if email already exists (different user)
        if (validData.email && validData.email !== existingUser.email) {
            const userByEmail = await userService.getUserByEmail(validData.email);
            if (userByEmail) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: 'User already exists with this email'
                });
            }
        }

        // Prepare data to update
        const dataToUpdate = {};
        if (validData.phoneNumber) dataToUpdate.phoneNumber = validData.phoneNumber.trim();
        if (validData.fullName) dataToUpdate.fullName = validData.fullName;
        if (validData.email) dataToUpdate.email = validData.email.toLowerCase().trim();
        if (validData.profileImageUrl !== undefined) dataToUpdate.profileImageUrl = validData.profileImageUrl;
        if (validData.deviceToken !== undefined) dataToUpdate.deviceToken = validData.deviceToken;

        // Update user
        const result = await userService.updateUser(userId, dataToUpdate);
        if (result) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'User updated successfully',
                data: {
                    userId: result.userId,
                    phoneNumber: result.phoneNumber,
                    fullName: result.fullName,
                    email: result.email,
                    profileImageUrl: result.profileImageUrl,
                    isActive: result.isActive,
                    isVerified: result.isVerified
                }
            });
        } else {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Failed to update user, please try again!'
            });
        }
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = updateUser;
