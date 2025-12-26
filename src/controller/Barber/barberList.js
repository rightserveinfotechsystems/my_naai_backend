const barberService = require('../../services/barber.service');

const getBarberList = async (request, response) => {
    try {
        const { 
            page = 1, searchString = ''} = request.body || {};

        console.log('🔍 Barber List Params:', { page, searchString});

        const data = await barberService.getBarbersList({ 
            page, 
            searchString
        });

        // If no barbers found
        if (!data.barbers || data.barbers.length === 0) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'No barbers found',
                data: {
                    barbers: [],
                    total: 0,
                    page: parseInt(page),
                    limit: data.limit || 20,
                    totalPages: 0
                }
            });
        }

        // Return barber list
        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Barber list fetched successfully',
            data
        });

    } catch (error) {
        console.error('Get Barber List Error:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getBarberList;
