const salonService = require('../../services/salon.service');
const { toggleOpenCloseValidationSchema } = require('../../validations/salon.validation');


const toggleOpenClose = async (request, response) => {
    try {

        // Extract data from request body
        const { salonId, isOpen } = request.body || {};

        // Validate input
        const validationResult = toggleOpenCloseValidationSchema.validate({ salonId, isOpen }, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Get salon
        const salon = await salonService.getSalonById(salonId);

        if (!salon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found'
            });
        }

        // Check if salon is active
        if (!salon.isActive && isOpen) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Cannot open an inactive salon'
            });
        }

        // Update salon open/close status
        const updatedSalon = await salonService.updateSalon(salonId, { isOpen });

        return response.status(200).json({
            status: 'SUCCESS',
            message: `Salon ${isOpen ? 'opened' : 'closed'} successfully`,
            data: updatedSalon
        });
    } catch (error) {
        console.error('Error in toggleOpenClose:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = toggleOpenClose;