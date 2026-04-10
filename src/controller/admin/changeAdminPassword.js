const bcrypt = require('bcryptjs');
const { changePasswordValidationSchema } = require('../../validations/admin.validation');
const adminService = require('../../services/admin.service');


const changePassword = async (request, response) => {
    try {
        // Get admin ID from authenticated request
        const adminId = request.admin.id;

        // Extract data from request body
        const { currentPassword, newPassword } = request.body || {};

        // Validate input
        const validationResult = changePasswordValidationSchema.validate(
            { currentPassword, newPassword },
            { abortEarly: true }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Get admin with password
        const admin = await adminService.getAdminById(adminId);
        if (!admin) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Admin not found'
            });
        }

        console.log('ADMIN FROM DB =>', admin?.toJSON?.() || admin);
        // console.log('currentPassword =>', currentPassword);
        // console.log('admin.password =>', admin?.password);


        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            admin.password
        );

        if (!isPasswordValid) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        // const hashPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await adminService.updateAdmin(adminId, {
            password: newPassword
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Password changed successfully'
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = changePassword;