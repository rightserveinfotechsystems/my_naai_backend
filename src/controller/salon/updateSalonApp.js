// controllers/app/updateSalon.app.js
const salonService = require('../../services/salon.service');
const { updateSalonWithDetailsAppSchema } = require('../../validations/salon.validation');

const updateSalonApp = async (request, response) => {
    try {
        const { salonId } = request.salon;
        const body = request.body || {};

        //  Validate full body (salonData + businessHours + services)
        const { error } = await updateSalonWithDetailsAppSchema.validateAsync(body, {
            abortEarly: true,
        });

        if (error) {
            return response.status(400).json({
                status: 'FAILED',
                message: error.details[0].message,
            });
        }

        const { salonData, businessHours, services } = body;

        const salon = await salonService.getSalonById(salonId);
        if (!salon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found for this user',
            });
        }


        //  Salon basic fields update
        if (salonData && Object.keys(salonData).length > 0) {
            await salonService.updateSalon(salonId, salonData);
        }

        //  BusinessHours update 
        if (Array.isArray(businessHours)) {
            for (const day of businessHours) {
                await salonService.upsertBusinessHour(salonId, day);
            }
        }

        //  Services update 
        if (Array.isArray(services)) {
            await salonService.syncSalonServices(salonId, services);
        }

        // Final updated salon detail
        const fullSalon = await salonService.getSalonWithDetails(salonId);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon updated successfully',
            data: fullSalon,
        });
    } catch (error) {
        console.error('Error in updateSalonApp:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message,
        });
    }
};

module.exports = updateSalonApp;
