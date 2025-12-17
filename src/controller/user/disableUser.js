const userService = require("../../services/user.service");
const { userIdValidationSchema } = require("../../validations/user.validation");

const changeUserStatus = async (request, response) => {
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
            response.status(200).json({
                status: "FAILED",
                message: "User not exist",
            });
            return;
        }
        // prepare data to update
        const dataToUpdate = {
            isActive: !isUserExist.isActive,
        };

        // update data into db & send response to client
        const result = await userService.updateUser(userId, dataToUpdate);
        if (result) {
            const message = dataToUpdate.isActive
                ? "User enabled successfully"
                : "User disabled successfully";

            response.status(200).json({
                status: "SUCCESS",
                message: message,
            });
            return;
        } else {
            response.status(200).json({
                status: "FAILED",
                message: "Failed to update user, Please try again!",
            });
            return;
        }
    } catch (error) {
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = changeUserStatus;
