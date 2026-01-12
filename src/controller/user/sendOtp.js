// controllers/user/sendOtp.controller.js
const userService = require('../../services/user.service');
const { generateOtp } = require('../../utils/middleware/otp.utils');
const { sendOtpValidationSchema } = require('../../validations/user.validation');
const db = require('../../database/models');


// controllers/user/sendOtp.controller.js
const sendOtp = async (request, response) => {
    try {
        const { phoneNumber } = request.body || {};
        // Validate
        const validationResult = sendOtpValidationSchema.validate({ phoneNumber });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // ✅ Check if user exists
        const user = await userService.getUserByPhone(phoneNumber);
        if (!user) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Please signup first. User does not exist'
            });
        }
        // 2) Generate OTP and send
        const otp = generateOtp(6);

        // 3) save OTP in DB 
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const otpLog = await db.OtpLog.create({
            phoneNumber,
            otpCode: otp,
            purpose: 'login',
            expiresAt
        });
        if (!otpLog) {
            return response.status(500).json({
                status: 'FAILED',
                message: 'Failed to generate OTP, please try again'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'OTP sent successfully',
            otp
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};


module.exports = sendOtp;
