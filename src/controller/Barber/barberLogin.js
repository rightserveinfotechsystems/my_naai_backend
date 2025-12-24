const barberService = require('../../services/barber.service');
const { generateToken } = require('../../utils/middleware/token.util');
const { verifyBarberOtpValidationSchema } = require('../../validations/barber.validation');


const verifyBarberOtpLogin = async (request, response) => {
    try {
        const { phoneNumber, otp, deviceToken } = request.body || {};

        const validationResult = verifyBarberOtpValidationSchema.validate({ phoneNumber, otp, deviceToken }, { abortEarly: true });
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

        // Get barber by phone
        const barber = await barberService.getBarberByPhoneNumber(phoneNumber);
        if (!barber || !barber.isActive) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'barber not found or inactive'
            });
        }

        // Generate JWT token
        const token = generateToken({
            barberId: barber.barberId
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'barber login successful',
            data: {
                // barber,
                barber: {
                    barberId: barber.barberId,
                    barberName: barber.barberName,
                    phoneNumber: barber.phoneNumber,
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

module.exports = verifyBarberOtpLogin;
