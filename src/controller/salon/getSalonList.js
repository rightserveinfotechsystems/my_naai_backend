const salonService = require('../../services/salon.service');

const listSalons = async (request, response) => {
    try {
        // Extract query parameters
        const filters = request.query;
        
        // Get salons list
        const result = await salonService.listSalons(filters);

      
        if (result.totalSalons > 0 || result.salons.length > 0) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Salons fetched successfully',
                data: result.salons,
                pagination: {
                    total: result.totalSalons || result.total || 0,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        } else {
            return response.status(200).json({
                status: 'FAILED',  // ✅ Business decision
                message: 'No salons available.',
                data: [],
                pagination: {
                    total: 0,
                    page: filters.page || 1,
                    limit: filters.limit || 20,
                    totalPages: 0
                }
            });
        }
    } catch (error) {
        console.error('Error in listSalons:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = listSalons;
