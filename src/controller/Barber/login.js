const barberService = require('../../services/barber.service');
const { generateToken } = require('../../utils/middleware/token.util');
const { verifyBarberOtpValidationSchema } = require('../../validations/barber.validation');
const db = require('../../database/models');


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

        const validData = validationResult.value;
        // const isValid = true;
        // if (!isValid) {
        //     return response.status(400).json({
        //         status: 'FAILED',
        //         message: 'Invalid or expired OTP'
        //     });
        // }

        // Get barber by phone
        const barber = await barberService.getBarberByPhoneNumber(phoneNumber);
        if (!barber || !barber.isActive) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'barber not found or inactive'
            });
        }

        // Verify OTP
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
            return response.status(401).json({
                status: 'FAILED',
                message: 'Invalid or expired OTP'
            });
        }


        // Mark OTP as used
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });


        // Update last login
        await barberService.updateBarber(barber.barberId, {
            lastLogin: new Date(),
            deviceToken: request?.body?.deviceToken || barber?.deviceToken
        });


        // Generate JWT token
        const token = generateToken({
            barberId: barber.barberId
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Barber login successful',
                barber: {
                    barberId: barber?.barberId,
                    fullName: barber?.fullName,
                    phoneNumber: barber?.phoneNumber,
                    email: barber?.email,
                    profileImageUrl: barber?.profileImageUrl || null,
                    isActive: barber?.isActive,
                    isAvailable: barber?.isAvailable,
                    isVerified: barber?.isVerified,
                    totalServices: barber?.totalServices,
                    ratingAverage:barber?.ratingAverage,
                    token
                },
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = verifyBarberOtpLogin;
