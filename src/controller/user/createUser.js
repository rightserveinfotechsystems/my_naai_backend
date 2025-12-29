// controllers/user/createUser.controller.js (Model method use karo)
const { createUserValidationSchema } = require('../../validations/user.validation');
const userService = require('../../services/user.service');
const db = require('../../database/models');

const createUser = async (request, response) => {
    try {
        const { fullName, phoneNumber, email, profileImageUrl, deviceToken, otp } = request.body;

        // Validation same...
        const validationResult = createUserValidationSchema.validate(
            { phoneNumber: phoneNumber?.toString(), otp, fullName, email, profileImageUrl, deviceToken },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;

        // User existence checks same...
        const isUserExistByPhone = await userService.getUserByPhone(validData.phoneNumber);
        if (isUserExistByPhone) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User already exists with this phone number'
            });
        }

        // ✅ SAME PATTERN AS verifyOtpLogin - WORKING!
        const otpRow = await db.OtpLog.findOne({
            where: {
                phoneNumber: validData.phoneNumber,
                otpCode: validData.otp,
                purpose: 'registration',  // Model enum
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

        // Mark OTP as used (same as login)
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });

        // Create user
        const dataToInsert = {
            phoneNumber: validData.phoneNumber.trim(),
            fullName: validData.fullName || null,
            email: validData.email ? validData.email.toLowerCase().trim() : null,
            profileImageUrl: validData.profileImageUrl || null,
            deviceToken: validData.deviceToken || null,
            isActive: true,
            isVerified: true
        };

        const result = await userService.createUser(dataToInsert);

        if (result) {
            return response.status(201).json({
                status: 'SUCCESS',
                message: 'User created successfully',
                data: result
            });
        }

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = createUser;
