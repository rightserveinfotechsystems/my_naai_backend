// controllers/user/sendOtpRegister.controller.js
const userService = require('../../services/user.service');
const { generateOtp } = require('../../utils/middleware/otp.utils');
const { sendOtpValidationSchema } = require('../../validations/user.validation');
const db = require('../../database/models');
const axios = require('axios');

const sendOtpRegister = async (request, response) => {
    try {
        const { phoneNumber } = request.body || {};

        // Validate (same)
        const validationResult = sendOtpValidationSchema.validate({ phoneNumber });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // CHANGE: User NOT exist check 
        const user = await userService.getUserByPhone(phoneNumber);
        if (user) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User already exists with this phone number, please login'
            });
        }

        // 2) Generate OTP and send (same)
        const otp = generateOtp(6);

        // 3) save OTP in DB (purpose: 'register')
        const messageResponse = await axios.get(`https://sms.adservs.co.in/vb/apikey.php?apikey=${process.env.SMS_SECRET_kEY}&senderid=MYNAAI&number=${phoneNumber}&templateid=1707176786337855348&message=Welcome%20to%20My%20Naai%20!%20Your%20registration%20OTP%20is%20${otp}.%20Please%20enter%20this%20to%20verify%20your%20account.%20MYNAAI`)
        if (messageResponse && messageResponse?.data?.status?.toLowerCase() === "success") {
            //  Save OTP in DB
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            const otpLog = await db.OtpLog.create({
                phoneNumber,
                otpCode: otp,
                purpose: 'registration',
                expiresAt
            });

            if (!otpLog) {
                return response.status(500).json({
                    status: 'FAILED',
                    message: 'Failed to generate OTP, please try again'
                });
            }

            //  Response
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'OTP sent successfully',
                otp: ""
            });
        } else {
            return response.status(200).json({
                status: 'FAILED',
                message: 'Failed to send otp, Please try again'
            });
        }
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = sendOtpRegister;
