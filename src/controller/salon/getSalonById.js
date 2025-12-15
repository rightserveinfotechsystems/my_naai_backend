const salonService = require('../../services/salon.service');

const getSalonById = async (request, response) => {
    try {
        // Get salon ID from params
        const { salonId } = request.params;

        // Check if details are requested
        const includeDetails = request.query.details === 'true';

        // Get salon
        const salon = includeDetails
            ? await salonService.getSalonWithDetails(salonId)
            : await salonService.getSalonById(salonId);

        if (!salon) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon retrieved successfully',
            data: salon
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getSalonById;