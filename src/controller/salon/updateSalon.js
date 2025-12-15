const salonService = require('../../services/salon.service');
const { updateSalonValidationSchema } = require('../../validations/salon.validation');


const updateSalon = async (request, response) => {
    try {
        // Get salon ID from params
        const { salonId } = request.params;

        // Extract data from request body
        const updateData = request.body;

        // Validate input
        const validationResult = updateSalonValidationSchema.validate(updateData, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Update salon
        const salon = await salonService.updateSalon(salonId, updateData);

        if (!salon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon updated successfully',
            data: salon
        });
    } catch (error) {
        console.error('Error in updateSalon:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = updateSalon;