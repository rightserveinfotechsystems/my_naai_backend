const salonService = require('../../services/salon.service');

const listSalonsApp = async (request, response) => {
    try {
        const page = parseInt(request.body.page) || 1;
        const limit = parseInt(request.body.limit) || 20;
        const searchString = request.body.searchString || '';
        const cityFilter = request.body.cityFilter || 'ALL';

        const result = await salonService.listSalons({ page, limit, searchString, cityFilter });

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