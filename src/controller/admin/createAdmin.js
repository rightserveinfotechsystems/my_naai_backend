const bcrypt = require('bcryptjs');
const { createAdminValidationSchema } = require('../../validations/admin.validation');
const adminService = require('../../services/admin.service');

const createAdmin = async (request, response) => {
    try {
        // Extract data from request body
        const { name, email, mobile, password } = request.body;

        // Validate input
        const validationResult = createAdminValidationSchema.validate(
            { name, email, mobile: mobile?.toString(), password },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Check if admin already exists with email
        const isAdminExist = await adminService.getAdminByEmail(email);
        if (isAdminExist) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Admin already exists with this email, please try with another email'
            });
        }

        // Hash password
        const hashPassword = await bcrypt.hash(password, 10);

        // Prepare data to insert
        const dataToInsert = {
            name: name,
            email: email.toLowerCase(),
            
            password: hashPassword,
            isActive: true
        };

        // Insert data into database
        const result = await adminService.createAdmin(dataToInsert);
        if (result) {
            return response.status(201).json({
                status: 'SUCCESS',
                message: 'Admin created successfully',
                data: {
                    adminId: result.adminId,
                    email: result.email,
                    name: result.name,
                }
            });
        } else {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Failed to create admin, please try again!'
            });
        }
    } catch (error) {
        console.log("error", error);

        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = createAdmin;