const userService = require("../../services/user.service");
const { userIdValidationSchema } = require("../../validations/user.validation");

const deleteUser = async (request, response) => {
    try {
        // extract data from request body
        const { userId } = request.body;

        // validate input
        const { error } = userIdValidationSchema.validate(request.body, { abortEarly: true });
        if (error) {
            return response.status(400).json({
                status: 'FAILED',
                message: error.details[0].message,
            });
        }

        // check user exist or not
        const isUserExist = await userService.getUserById(userId);
        if (!isUserExist) {
            return response.status(404).json({
                status: "FAILED",
                message: "User not found",
            });
        }

        // delete user from db & send response to client
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
    } catch (error) {
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = deleteUser;
