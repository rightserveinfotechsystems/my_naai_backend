const userService = require('../../services/user.service');
const db = require('../../database/models');
const jwt = require('jsonwebtoken');


const userOnBoarding = async (request, response) => {
    try {
        const { fullName, phoneNumber, deviceToken, } = request.body;

        // Create user
        const dataToInsert = {
            phoneNumber: phoneNumber?.toString(),
            fullName: fullName || null,
            email: null,
            profileImageUrl: null,
            deviceToken: deviceToken || null,
            isActive: true,
            isVerified: true
        };

        const result = await userService.createUser(dataToInsert);

        if (result) {
            // Generate JWT token   
            const token = jwt.sign(
                { userId: result.userId },
                process.env.JWT_SECRET || 'your-secret-key',
            );
           
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'User created successfully',
                data: {
                    ...result.dataValues,
                    token: token
                }
            });
        }

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = userOnBoarding;
