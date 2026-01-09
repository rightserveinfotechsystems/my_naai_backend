const salonService = require('../../services/salon.service');

const listSalonsByUser = async (request, response) => {
    try {
        const page = parseInt(request.body.page) || 1;
        const limit = parseInt(request.body.limit) || 20;
        const searchString = request.body.searchString || '';
        const cityFilter = request.body.cityFilter || 'ALL';

        const result = await salonService.getActiveSalonsListForUsers({ page, limit, searchString, cityFilter });
         const message = result.totalSalons > 0 
            ? 'Salons fetched successfully'
            : 'No matching salons found';

        return response.status(200).json({
            status: 'SUCCESS',
            message,
            data: result.salons,
            pagination: {
                total: result.totalSalons,
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


module.exports = listSalonsByUser;