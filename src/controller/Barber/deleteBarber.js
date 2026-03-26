const barberService = require('../../services/barber.service');

const deleteBarber = async (request, response) => {
    try {
        //  Get barber ID from params OR body
        const { barberId } =  request.body || {};

        if (!barberId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'barberId required'
            });
        }

        //  Check if barber has active bookings/queues
        // const hasActiveBookings = await barberService.hasActiveBookings(barberId);
        // const hasActiveQueues = await barberService.hasActiveQueues(barberId);

        // if (hasActiveBookings) {
        //     return response.status(400).json({
        //         status: 'FAILED',
        //         message: 'Cannot delete barber with active bookings. Please complete or cancel them first.'
        //     });
        // }

        // if (hasActiveQueues) {
        //     return response.status(400).json({
        //         status: 'FAILED',
        //         message: 'Cannot delete barber with active queues. Please complete or serve them first.'
        //     });
        // }

        //  Soft delete barber
        const result = await barberService.deleteBarber(barberId);

        if (!result) {
            return response.status(404).json({
                status: 'FAILED',
                message: 'Barber not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Barber deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteBarber:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = deleteBarber;
