const salonService = require('../../services/salon.service');
const userService = require('../../services/user.service');
const { salonIdValidationSchema } = require('../../validations/salon.validation');

const saveSalonToggle = async (request, response) => {
    try {
        const userId = request.user?.id;  // Get user ID from request
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

          // check existing saved salon
        const existingSavedSalon = await userService.getUserSavedSalon(userId);

        // if already salon saved and it is different salon
        if (existingSavedSalon && existingSavedSalon.salonId !== salonId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'You can only save one salon at a time. Please unsave previous salon first.'
            });
        }

        // Toggle bookmark
        const saved = await userService.toggleUserBookmark(userId, salonId);

        if (saved) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Salon saved successfully'
            });
        } else {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Salon unsaved successfully'
            });
        }
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = saveSalonToggle;
