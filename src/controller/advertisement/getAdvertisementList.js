const advertisementService = require('../../services/advertisement.service');

const listAdvertisementsAdmin= async (request, response) => {
    try {
        // Extract query parameters
        const filters = request.body || {};

        // Get advertisements list
        const result = await advertisementService.listAdvertisements(filters);

        if (result.totalAdvertisements > 0 || result.advertisements.length > 0) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'Advertisements fetched successfully',
                data: result.advertisements,
                pagination: {
                    total: result.totalAdvertisements || result.total || 0,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        } else {
            return response.status(200).json({
                status: 'FAILED',  // ✅ Business decision
                message: 'No advertisements available.',
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
        console.error('Error in listAdvertisements:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = listAdvertisementsAdmin;
