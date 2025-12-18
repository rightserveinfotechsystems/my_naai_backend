const salonService = require('../../services/salon.service');
const { verifySalonOtpValidationSchema } = require('../../validations/salon.validation');
const { generateToken } = require('../../utils/middleware/token.util');


const verifySalonOtpLogin = async (request, response) => {
    try {
        const { phoneNumber, otp, deviceToken } = request.body || {};

        const validationResult = verifySalonOtpValidationSchema.validate({ phoneNumber, otp, deviceToken }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }


        const isValid = true;
        if (!isValid) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Invalid or expired OTP'
            });
        }

        // Get salon by phone
        const salon = await salonService.getSalonByPhone(phoneNumber);
        if (!salon || !salon.isActive) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found or inactive'
            });
        }

        // Generate JWT token
        const token = generateToken({
            salonId: salon.salonId,
            // role: 'SALON'
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon login successful',
            data: {
                // salon,
                salon: {
                    salonId: salon.salonId,
                    salonName: salon.salonName,
                    phoneNumber: salon.phoneNumber,
                },
                token
            }
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = verifySalonOtpLogin;
