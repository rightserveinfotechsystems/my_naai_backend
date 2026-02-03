const bcrypt = require('bcryptjs');
const { createAdminValidationSchema } = require('../../validations/admin.validation');
const adminService = require('../../services/admin.service');

const createAdminPanelUser = async (request, response) => {
    try {
        // Extract data from request body
        const { name, email, mobile, password, accessTab } = request.body;

        // Validate input
        const validationResult = createAdminValidationSchema.validate(
            { name, email, mobile: mobile?.toString(), password, accessTab },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Check if user already exists with email
        const isAdminExist = await adminService.getAdminByEmail(email);
        if (isAdminExist) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'User already exists with this email, please try with another email'
            });
        }

        // Prepare data to insert
        const dataToInsert = {
            name: name,
            email: email.toLowerCase(),
            mobile: mobile,
            password,
            accessTab,
            isActive: true
        };


        // Insert data into database
        const result = await adminService.createAdmin(dataToInsert);
        if (result) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'User created successfully',
                data: {
                    adminId: result.adminId,
                    email: result.email,
                    name: result.name,
                    mobile: result.mobile
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

module.exports = createAdminPanelUser;