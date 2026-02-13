const salonService = require('../../services/salon.service');
const userService = require('../../services/user.service');
const { salonIdValidationSchema } = require('../../validations/salon.validation');

const saveSalon = async (request, response) => {
    try {
        const userId = request.user?.id;  // Get user ID from request
        console.log('User ID from request:', userId);
        console.log('Request user object:', request.user);

        const { salonId } = request?.body;

        // Validate input
        const validationResult = salonIdValidationSchema.validate({ salonId }, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Check if salon exists
        const isSalonExist = await salonService.getSalonById(salonId);
        if (!isSalonExist) {
            return response.status(200).json({
                status: 'FAILED',
                message: 'Salon does not exist with this ID'
            });
        }

        //  Save salon for user
        // const updateUser = await userService.updateUserSavedSalon(userId, salonId);
        // if (updateUser) {
        //     return response.status(200).json({
        //         status: 'SUCCESS',
        //         message: 'Salon saved successfully'
        //     });
        // }
        // else {
        //     return response.status(200).json({ 
        //         status: 'FAILED',
        //         message: 'You can only save one salon. Please remove the previously saved salon first!'
        //     });
        // }

        // Save salon
        const saved = await userService.saveUserBookmark(userId, salonId);
        if (!saved) {
            return response.status(200).json({
                status: 'FAILED',
                message: 'Salon already saved'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon saved successfully'
        });

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = saveSalon;
