const barberService = require('../../services/barber.service');
const { toggleAvailabilityValidationSchema } = require('../../validations/barber.validation');

const toggleAvailability = async (request, response) => {
    try {
        // Extract data from request body
        const { barberId, isAvailable } = request.body || {};

  
        const existingBarber = await barberService.getBarberById(barberId);
        if (!existingBarber || !existingBarber.isActive) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Inactive barber cannot change availability'
            });
        }

        // Validate input
        const validationResult = toggleAvailabilityValidationSchema.validate({ barberId, isAvailable }, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({ 
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Update Barber availability
        const updateData = { isAvailable };

        const barber = await barberService.updateBarber(barberId, updateData);

        if (!barber) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Barber not found'
            });
        }
        
        // Final status after update
        const finalStatus = barber.isAvailable;
        return response.status(200).json({
            status: 'SUCCESS',
            message: `Barber ${finalStatus ? 'available' : 'unavailable'} successfully`,
            data: barber
        });
    } catch (error) {
        console.error('Error in toggleAvailability:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = toggleAvailability;
