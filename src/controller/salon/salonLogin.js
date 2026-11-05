const salonService = require('../../services/salon.service');
const { verifySalonOtpValidationSchema } = require('../../validations/salon.validation');
const { generateToken } = require('../../utils/middleware/token.util');
const db = require('../../database/models');
const partnerPlanService = require('../../services/partnerPlan.service');
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


        if (salon && !salon.isActive) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon account is inactive. Please contact MY Naai Admin to activate your account.'
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

        //delete the verified otp
        await db.OtpLog.destroy({
            where: {
                phoneNumber
            }
        });

        if (salon) {

            // Update last login ONLY
            await salonService.updateSalon(salon.salonId, {
                lastLogin: new Date()
            });


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

            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Salon login successful',
                data: {
                    salon,
                    token
                },
                isNewSalon: (salon?.isProfileCompleted && salon?.isProfileCompleted === false) ? true : false
            });
        } else {
            const freeTrialDays = await partnerPlanService.defaultTrialDays();
            const dataToInsert = {
                salonName: "Your Salon Name",
                phoneNumber: phoneNumber,
                genderType: 'UNISEX',
                isActive: true,
                isOpen: false,
                isPlanActive: true,
                planType: 'FREE',
                planStartDate: new Date(),
                // The free trial length is the admin panel's `Free` plan
                // (`partner_plans.days`), 90 days by default. It used to be a
                // hard-coded `+ 20`, which is why the portal advertised one
                // trial length and the backend granted another.
                planEndDate: new Date(new Date().setDate(new Date().getDate() + freeTrialDays)),
                totalReviews: 0,
                totalRating: 0,
                deviceToken: deviceToken || null,
                isProfileCompleted: false
            };
            const newSalon = await salonService.createSalon(dataToInsert);

            // Insert new device
            if (deviceToken) {
                await DeviceToken.create({
                    salonId: newSalon.salonId,
                    deviceToken
                });
            }

            return response.status(201).json({
                status: 'SUCCESS',
                message: 'Salon account not found. A new salon account has been created. Please update your salon details to activate your account.',
                data: {
                    salon: newSalon,
                    token: generateToken({
                        salonId: newSalon.salonId
                    })
                },
                isNewSalon: true
            });
        }
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = verifySalonOtpLogin;
