const salonService = require('../../services/salon.service');
const { verifySalonOtpValidationSchema } = require('../../validations/salon.validation');
const { generateToken } = require('../../utils/middleware/token.util');
const db = require('../../database/models');
const { DeviceToken } = db;


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


        const validData = validationResult.value;

        // Get salon by phone
        const salon = await salonService.getSalonByPhone(validData.phoneNumber);
        if (!salon || !salon.isActive) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found or inactive'
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

        //  Mark OTP as used
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });


        // Update last login ONLY
        await salonService.updateSalon(salon.salonId, {
            lastLogin: new Date()
        });

        // ✅ NEW DEVICE TOKEN FLOW (MULTIPLE DEVICES SAFE)
        if (deviceToken) {
            const existingToken = await DeviceToken.findOne({
                where: {
                    salonId: salon.salonId,
                    deviceToken: deviceToken
                }
            });

            if (!existingToken) {
                await DeviceToken.create({
                    salonId: salon.salonId,
                    deviceToken: deviceToken
                });
            }
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
