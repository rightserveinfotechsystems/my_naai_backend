const salonService = require('../../services/salon.service');
const { toggleStatusValidationSchema } = require('../../validations/salon.validation');


const toggleStatus = async (request, response) => {
    try {

        // Extract data from request body
        const { salonId,isActive } = request.body || {};

        // Validate input
        const validationResult = toggleStatusValidationSchema.validate({ salonId, isActive }, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Update salon status
        const updateData = { isActive };

        // If deactivating, also close the salon
        if (!isActive) {
            updateData.isOpen = false;
        }

        const salon = await salonService.updateSalon(salonId, updateData);

        if (!salon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found'
            });
        }
        //  Final status after update
        const finalStatus = salon.isActive;
        return response.status(200).json({
            status: 'SUCCESS',
            message: `Salon ${finalStatus  ? 'enabled' : 'disabled'} successfully`,
            data: salon
        });
    } catch (error) {
        console.error('Error in toggleStatus:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = toggleStatus;