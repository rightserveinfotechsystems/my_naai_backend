const userService = require("../../services/user.service");
const { userIdValidationSchema, bulkUserIdValidationSchema } = require("../../validations/user.validation");

const deleteUser = async (request, response) => {
    try {
        const { userId, userIds } = request.body;

        // ✅ Single delete
        if (userId) {
            // Validate single userId
            const { error } = userIdValidationSchema.validate(request.body, { abortEarly: true });
            if (error) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: error.details[0].message,
                });
            }

            // Check user exist
            const isUserExist = await userService.getUserById(userId);
            if (!isUserExist) {
                return response.status(404).json({
                    status: "FAILED",
                    message: "User not found",
                });
            }

            // Delete single user
            const result = await userService.deleteUser(userId);
            if (result) {
                return response.status(200).json({
                    status: "SUCCESS",
                    message: "User deleted successfully",
                });
            } else {
                return response.status(500).json({
                    status: "FAILED",
                    message: "Failed to delete user, Please try again!",
                });
            }
        } 
        // ✅ Bulk delete - FIXED
        else if (userIds && Array.isArray(userIds)) {
            // Manual validation (skip Joi if issues)
            if (!userIds.every(id => typeof id === 'string' && id.length > 0)) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: 'userIds must be array of valid strings',
                });
            }

            // ✅ Extract actual IDs (handles nested format)
            const actualIds = userIds.map(id => 
                typeof id === 'object' && id.userId ? id.userId : id
            ).filter(Boolean);

            if (actualIds.length === 0) {
                return response.status(400).json({
                    status: "FAILED",
                    message: "No valid user IDs provided",
                });
            }

            // ✅ FIXED: userId column (not id) [file:32]
            const existingUsers = await userService.getUsersByIds(actualIds);
            const nonExistingIds = actualIds.filter(id => 
                !existingUsers.some(user => user.userId == id)  // ✅ userId not id
            );
            
            if (nonExistingIds.length > 0) {
                return response.status(404).json({
                    status: "FAILED",
                    message: `Users not found: ${nonExistingIds.join(', ')}`,
                });
            }

            // Bulk delete
            const deletedCount = await userService.deleteUsersBulk(actualIds);
            
            return response.status(200).json({
                status: "SUCCESS",
                message: `${deletedCount} users deleted successfully`,
                deletedCount,
                attempted: actualIds.length
            });
        } 
        // ✅ Neither provided
        else {
            return response.status(400).json({
                status: "FAILED",
                message: "Either userId (single) or userIds array is required",
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

module.exports = deleteUser;
