// controllers/user/verifyOtp.controller.js
const userService = require('../../services/user.service');
const jwt = require('jsonwebtoken'); 
const { verifyOtpValidationSchema } = require('../../validations/user.validation');

const verifyOtpLogin = async (request, response) => {
    try {
        const { phoneNumber, otp } = request.body;

        // Validate
        const validationResult = verifyOtpValidationSchema.validate({ phoneNumber, otp });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;

        // Demo OTP check ( from Redis/DB do verify in production)
        const correctOtp = '123456'; // Demo OTP 
        if (validData.otp !== correctOtp) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Invalid OTP'
            });
        }

        // Get user
        const user = await userService.getUserByPhone(validData.phoneNumber);
        if (!user || !user.isActive) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'User not found or inactive'
            });
        }

        // Update last login
        await userService.updateUser(user.userId, { 
            lastLogin: new Date(),
            deviceToken: request.body.deviceToken || user.deviceToken
        });

        const token = jwt.sign(
    { userId: user.userId }, 
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Login successful',
            data: {
                userId: user.userId,
                phoneNumber: user.phoneNumber,
                fullName: user.fullName || null,
                email: user.email || null,
                profileImageUrl: user.profileImageUrl || null,
                isActive: user.isActive,
                isVerified: user.isVerified,
                 token: token // JWT generate 
            }
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = verifyOtpLogin;
