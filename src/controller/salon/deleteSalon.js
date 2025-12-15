const salonService = require('../../services/salon.service');

const deleteSalon = async (request, response) => {
    try {
        // Get salon ID from params
        const { salonId } = request.params;

        // Check if salon has active queues
        const hasActiveQueues = await salonService.hasActiveQueues(salonId);

        if (hasActiveQueues) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Cannot delete salon with active queues. Please complete or cancel them first.'
            });
        }

        // Delete salon
        const result = await salonService.deleteSalon(salonId);

        if (!result) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteSalon:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = deleteSalon;