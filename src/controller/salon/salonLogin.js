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
        if (!salon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found.'
            });
        }

        if (!salon.isActive) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon account is inactive.'
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


        // if (deviceToken) {
        //     const devices = await DeviceToken.findAll({
        //         where: { salonId: salon.salonId }
        //     });

        //     const alreadyExists = devices.some(
        //         device => device.deviceToken === deviceToken
        //     );

        //     if (!alreadyExists && devices.length >= 10) {
        //         return response.status(403).json({
        //             status: 'FAILED',
        //             message: 'Already logged in on 10 devices'
        //         });
        //     }

        //     if (!alreadyExists) {
        //         await DeviceToken.create({
        //             salonId: salon.salonId,
        //             deviceToken
        //         });
        //     }
        // }

        if (deviceToken) {
            //  Check if device already exists
            const existingDevice = await DeviceToken.findOne({
                where: {
                    salonId: salon.salonId,
                    deviceToken
                }
            });
            if (existingDevice) {
            } else {
                //  Count total devices
                const deviceCount = await DeviceToken.count({
                    where: { salonId: salon.salonId }
                });
                // If limit reached → delete oldest
                if (deviceCount >= 10) {
                    const oldestDevice = await DeviceToken.findOne({
                        where: { salonId: salon.salonId },
                        order: [['createdAt', 'ASC']]
                    });
                    if (oldestDevice) {
                        await oldestDevice.destroy();
                    }
                }
                // Insert new device
                await DeviceToken.create({
                    salonId: salon.salonId,
                    deviceToken
                });
                console.log(`📱 New device added: ${deviceToken}`);
            }
        }
        // Generate JWT token
        const token = generateToken({
            salonId: salon.salonId,
            // role: 'SALON'
        });


        //delete the verified otp
        await db.OtpLog.destroy({
            where: {
                phoneNumber
            }
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
