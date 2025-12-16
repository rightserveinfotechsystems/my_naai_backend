// controllers/user/sendOtp.controller.js
const userService = require('../../services/user.service');
const { sendOtpValidationSchema } = require('../../validations/user.validation');

// controllers/user/sendOtp.controller.js
const sendOtp = async (request, response) => {
    try {
        const { phoneNumber } = request.body;
        // Validate
        const validationResult = sendOtpValidationSchema.validate({ phoneNumber });
        if (validationResult.error) {   
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

       

        // ✅ NAYA CODE (Sirf existing check)
        const user = await userService.getUserByPhone(phoneNumber);
        if (!user) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Please signup first. User does not exist'
            });
        }

        // ✅ Existing user hai → OTP bhej do
        const otp = '123456'; // Production me SMS
        console.log(`OTP for ${phoneNumber}: ${otp}`);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'OTP sent successfully'
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};


module.exports = sendOtp;
