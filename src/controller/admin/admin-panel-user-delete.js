const adminService = require('../../services/admin.service');
const { userIdValidationSchema } = require("../../validations/user.validation");

const deleteAdminPanelUser = async (request, response) => {
    try {
        const { userId } = request.body;

        // ❌ Check if userId is provided
        if (!userId) {
            return response.status(400).json({
                status: "FAILED",
                message: "userId is required",
            });
        }

        // ✅ Validate userId
        const { error } = userIdValidationSchema.validate({ userId }, { abortEarly: true });
        if (error) {
            return response.status(400).json({
                status: 'FAILED',
                message: error.details[0].message,
            });
        }

        // ✅ Check if user exists
        const isUserExist = await adminService.getAdminById(userId);
        if (!isUserExist) {
            return response.status(404).json({
                status: "FAILED",
                message: "User not found",
            });
        }

        // ✅ Delete user
        const result = await adminService.deleteAdmin(userId);
        if (result) {
            return response.status(200).json({
                status: "SUCCESS",
                message: "User deleted successfully",
            });
        } else {
            return response.status(500).json({
                status: "FAILED",
                message: "Failed to delete user, please try again!",
            });
        }

    } catch (error) {
        console.error('Delete user error:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = deleteAdminPanelUser;
