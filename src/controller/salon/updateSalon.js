const salonService = require('../../services/salon.service');
const { updateSalonValidationSchema } = require('../../validations/salon.validation');


const updateSalon = async (request, response) => {
    try {
        // Extract data from request body
        const { salonId, salonData, businessHours, services } = request.body || {};

        if (!salonId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'salonId is required',
            });
        }
        // Validate input
        const { error } = updateSalonValidationSchema.validate(request.body, { abortEarly: true });
        if (error) {
            return response.status(400).json({
                status: 'FAILED',
                message: error.details[0].message,
            });
        }
        // Update salon
        const updatedSalon = await salonService.updateSalon(salonId, salonData);
        if (!updatedSalon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found',
            });
        }

        //BusinessHours update 
        if (Array.isArray(businessHours)) {
            for (const day of businessHours) {
                await salonService.upsertBusinessHour(salonId, day);
            }
        }

        //Services update 
        if (Array.isArray(services)) {
            await salonService.syncSalonServices(salonId, services);
        }

        const fullSalon = await salonService.getSalonWithDetails(salonId);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon updated successfully',
            data: fullSalon
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