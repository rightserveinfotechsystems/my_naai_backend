// controllers/user/verifyOtp.controller.js
const userService = require('../../services/user.service');
const jwt = require('jsonwebtoken');
const { verifyOtpValidationSchema } = require('../../validations/user.validation');
const db = require('../../database/models');

const verifyOtpLogin = async (request, response) => {
    try {
        const { phoneNumber, otp, deviceToken } = request.body;

        // Validate
        const validationResult = verifyOtpValidationSchema.validate({ phoneNumber, otp, deviceToken }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;


        // Get user
        const user = await userService.getUserByPhone(validData.phoneNumber);
        if (!user || !user.isActive) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'User not found or inactive'
            });
        }

        // 3) Verify OTP
        const otpRow = await db.OtpLog.findOne({
            where: {
                phoneNumber: validData.phoneNumber,
                otpCode: validData.otp,
                purpose: 'login',
                isVerified: false
            },
            order: [['createdAt', 'DESC']]
        });

        // Otp Expired / not found
        if (!otpRow || otpRow.expiresAt < new Date()) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Invalid or expired OTP'
            });
        }

        // 4) Mark OTP as used
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });

        // Update last login
        await userService.updateUser(user.userId, {
            lastLogin: new Date(),
            deviceToken: request?.body?.deviceToken || user?.deviceToken
        });

        // Generate JWT token   
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
