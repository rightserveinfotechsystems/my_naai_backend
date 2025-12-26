const barberService = require('../../services/barber.service');
const { toggleStatusValidationSchema } = require('../../validations/barber.validation');


const toggleStatus = async (request, response) => {
    try {

        // Extract data from request body
        const { barberId, isActive } = request.body || {};

        // Validate input
        const validationResult = toggleStatusValidationSchema.validate({ barberId, isActive }, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({ 
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Update Barber status
        const updateData = { isActive };

        // If deactivating, also close the Barber
        if (!isActive) {
            updateData.isOpen = false;
        }

        const barber = await barberService.updateBarber(barberId, updateData);

        if (!barber) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Barber not found'
            });
        }
        //  Final status after update
        const finalStatus = barber.isActive;
        return response.status(200).json({
            status: 'SUCCESS',
            message: `Barber ${finalStatus  ? 'enabled' : 'disabled'} successfully`,
            data: barber
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