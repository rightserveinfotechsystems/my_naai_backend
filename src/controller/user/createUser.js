// controllers/user/createUser.controller.js (Model method use karo)
const { createUserValidationSchema } = require('../../validations/user.validation');
const userService = require('../../services/user.service');
const db = require('../../database/models');
const jwt = require('jsonwebtoken');
const { where } = require('sequelize');

const createUser = async (request, response) => {
    try {
        const { fullName, phoneNumber, email, profileImageUrl, deviceToken, otp } = request.body;

        // Validation same
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

        // User existence check
        const isUserExistByPhone = await userService.getUserByPhone(validData.phoneNumber);
        if (isUserExistByPhone) {
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


        // Mark OTP as used 
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });

        // Create user
        const dataToInsert = {
            phoneNumber: validData?.phoneNumber.trim(),
            fullName: validData?.fullName || null,
            email: validData.email ? validData.email.toLowerCase().trim() : null,
            profileImageUrl: validData?.profileImageUrl || null,
            deviceToken: validData?.deviceToken || null,
            isActive: true,
            isVerified: true
        };

        const result = await userService.createUser(dataToInsert);



        if (result) {
            // Generate JWT token   
            const token = jwt.sign(
                { userId: result.userId },
                process.env.JWT_SECRET || 'your-secret-key',
            );
            //delete the verified otp
            await db.OtpLog.destroy({
                where: {
                    phoneNumber
                }
            });
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

module.exports = createUser;
