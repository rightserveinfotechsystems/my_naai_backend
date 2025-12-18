const bcrypt = require('bcryptjs');
const adminService = require('../../services/admin.service');
const { loginValidationSchema } = require('../../validations/admin.validation');
const { generateToken } = require('../../utils/middleware/token.util');


const loginAdmin = async (request, response) => {
    try {
        // Extract data from request body
        const { email, password } = request.body;

        // Validate input
        const validationResult = loginValidationSchema.validate(
            { email, password },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Find admin by email or username
        const admin = await adminService.getAdminByEmail(email);
        if (!admin) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Invalid Email, Please check and try again'
            });
        }

        // Check if admin is active
        if (!admin.isActive) {
            return response.status(403).json({
                status: 'FAILED',
                message: 'Your account has been deactivated. Please contact support.'
            });
        }



        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        console.log('isPasswordValid:', isPasswordValid);
        if (!isPasswordValid) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Invalid Password, Please check and try again'
            });
        }

        // Update last login
        await adminService.updateAdmin(admin.id, {
            lastLogin: new Date()
        });

        // Generate JWT token
        const token = generateToken({
            adminId: admin.id,
            name: admin.name,
            email: admin.email,
            mobile: admin.mobile
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Login successful',
            data: {
                admin: {
                    adminId: admin.id,
                    name: admin.name,
                    email: admin.email,
                    mobile: admin.mobile
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

module.exports = loginAdmin;