const salonService = require('../../services/salon.service');

const listSalonsApp = async (request, response) => {
    try {
        // Extract query parameters
        const filters = request.query;

        // Get salons list
        const result = await salonService.listSalons(filters);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salons fetched successfully',
            data: result.salons,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        console.error('Error in listSalons:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = listSalonsApp;