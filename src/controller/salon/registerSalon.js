// controllers/user/createUser.controller.js (Model method use karo)
const salonService = require('../../services/salon.service');
const db = require('../../database/models');
const jwt = require('jsonwebtoken');
const { registerSalonValidationSchema } = require('../../validations/salon.validation');
const { valid } = require('joi');

const registerSalon = async (request, response) => {
    try {
        const { fullName, salonName, phoneNumber, address, deviceToken, otp } = request.body;

        // Validation same
        const validationResult = await registerSalonValidationSchema.validate(
            { salonName, phoneNumber: phoneNumber?.toString(), otp, fullName, address, deviceToken },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;

        // User existence check
        const isSalonExistByPhone = await salonService.getSalonByPhone(validData.phoneNumber);
        if (isSalonExistByPhone) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User already exists with this phone number'
            });
        }


        const otpRow = await db.OtpLog.findOne({
            where: {
                phoneNumber: validData.phoneNumber,
                otpCode: validData.otp,
                purpose: 'registration',
                isVerified: false
            },
            order: [['createdAt', 'DESC']]
        });

        if (!otpRow || otpRow.expiresAt < new Date()) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Invalid or expired OTP'
            });
        }

        // Mark OTP as used 
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });

        // Create salon
        const dataToInsert = {
            phoneNumber: validData.phoneNumber.trim(),
            fullName: validData.fullName || null,
            salonName: validData.salonName || null,
            address: validData.address || null,
            deviceToken: validData.deviceToken || null,
            // isActive: true,
            // isVerified: true
        };

        const result = await salonService.registerSalon(dataToInsert);



        if (result) {
            // Generate JWT token   
            const token = jwt.sign(
                { userId: result.userId },
                process.env.JWT_SECRET || 'your-secret-key',
            );
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'User created successfully',
                data: {
                    ...result.dataValues,
                    token: token
                }
            });
        }

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = registerSalon;
