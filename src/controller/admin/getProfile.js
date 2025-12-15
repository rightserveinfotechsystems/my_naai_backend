const adminService = require('../../services/admin.service');

const getProfile = async (request, response) => {
    try {
        // Get admin ID from authenticated request
        const adminId = request.admin.adminId;

        // Get admin profile
        const admin = await adminService.getAdminById(adminId);
        if (!admin) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Admin not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Profile retrieved successfully',
            data: admin
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getProfile;