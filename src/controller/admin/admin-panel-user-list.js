const adminService = require('../../services/admin.service');



const getAdminPanelUserList = async (request, response) => {
    try {
        const { page = 1, searchString = '' } = request.body || {};

        const data = await adminService.listAdmins({ page, searchString });

        // If no users found
        if (!data.users || data.users.length === 0) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'User list fetched successfully',
                data
            });
        }
        // Return user list
        return response.status(200).json({
            status: 'SUCCESS',
            message: 'User list fetched successfully',
            data
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getAdminPanelUserList;