// controllers/user/verifyOtp.controller.js
const userService = require('../../services/user.service');
const jwt = require('jsonwebtoken');
const { verifyOtpValidationSchema } = require('../../validations/user.validation');
const db = require('../../database/models');

const verifyOtpLogin = async (request, response) => {
    try {
        const { phoneNumber, otp, deviceToken } = request.body || {};

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

        //User not found
        if (!user) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        // User found but inactive
        if (!user.isActive) {
            return response.status(403).json({
                status: 'FAILED',
                message: 'User account is inactive'
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

        //OTP not found OR OTP does not match
        if (!otpRow || otpRow.otpCode !== validData.otp) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Invalid OTP'
            });
        }

        //  OTP expired
        if (otpRow.expiresAt < new Date()) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'OTP has expired'
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
            process.env.JWT_SECRET || 'secret_key'
        );

        //delete the verified otp
        await db.OtpLog.destroy({
            where: {
                phoneNumber
            }
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Login successful',
            data: {
                userId: user?.userId,
                phoneNumber: user?.phoneNumber,
                fullName: user?.fullName || null,
                email: user?.email || null,
                profileImageUrl: user?.profileImageUrl || null,
                isActive: user?.isActive,
                isVerified: user?.isVerified,
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
