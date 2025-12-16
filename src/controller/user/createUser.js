// controllers/user/createUser.controller.js
const { createUserValidationSchema } = require('../../validations/user.validation');
const userService = require('../../services/user.service');

const createUser = async (request, response) => {
    try {
        // Extract data from request body
        const { fullName, phoneNumber, email, profileImageUrl, deviceToken } = request.body;

        // Validate input
        const validationResult = createUserValidationSchema.validate(
            { phoneNumber: phoneNumber?.toString(), fullName, email, profileImageUrl, deviceToken },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;

        // Check if user already exists with phone
        const isUserExistByPhone = await userService.getUserByPhone(validData.phoneNumber);
        if (isUserExistByPhone) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User already exists with this phone number, please try with another number'
            });
        }

        // Check if user already exists with email 
        if (validData.email) {
            const isUserExistByEmail = await userService.getUserByEmail(validData.email);
            if (isUserExistByEmail) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: 'User already exists with this email, please try with another email'
                });
            }
        }

        // Prepare data to insert
        const dataToInsert = {
            phoneNumber: validData.phoneNumber.trim(),
            fullName: validData.fullName || null,
            email: validData.email ? validData.email.toLowerCase().trim() : null,
            profileImageUrl: validData.profileImageUrl || null,
            deviceToken: validData.deviceToken || null,
            isActive: true,
            isVerified: false
        };

        // Insert data into database
        const result = await userService.createUser(dataToInsert);

        if (result) {
            return response.status(201).json({
                status: 'SUCCESS',
                message: 'User created successfully',
                data: {
                    userId: result.userId,
                    phoneNumber: result.phoneNumber,
                    fullName: result.fullName,
                    email: result.email,
                    profileImageUrl: result.profileImageUrl,
                    isActive: result.isActive,
                    isVerified: result.isVerified
                }
            });
        } else {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Failed to create user, please try again!'
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
