const adminService = require('../../services/admin.service');
const { toggleStatusValidationSchema } = require('../../validations/admin.validation');


const toggleAdminStatus = async (request, response) => {
    try {

        // Extract data from request body
        const { userId, isActive } = request.body || {};

        // Validate input
        const validationResult = toggleStatusValidationSchema.validate({ userId, isActive }, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Update user status
        const updateData = { isActive };

        // If deactivating, also close the user
        if (!isActive) {
            updateData.isOpen = false;
        }

        const user = await adminService.updateAdminPanelUser(userId, updateData);

        if (!user) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'user not found'
            });
        }
        //  Final status after update
        const finalStatus = user.isActive;
        return response.status(200).json({
            status: 'SUCCESS',
            message: `User ${finalStatus  ? 'enabled' : 'disabled'} successfully`,
            data: user
        });
    } catch (error) {
        console.error('Error in toggleStatus:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = toggleAdminStatus;