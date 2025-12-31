const salonRequestService = require('../../services/salonrequest.service');

const getSalonRequestList = async (request, response) => {
    try {
        // 🎯 Extract data from request body
        const filters = request.body;

        // 🎯 Fetch Data from Service
        const result = await salonRequestService.listSalonRequests(filters);

        // 🎯 Data Found Case
          if (result.totalRequests > 0 && result.requests.length > 0) {
            return response.status(200).json({
                status: "SUCCESS",
                message: "Salon requests fetched successfully",
                data: result.requests,           // ✅ requests array
                pagination: {
                    total: result.totalRequests,  // ✅ totalRequests
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        }

        // 🎯 No Data Case
        return response.status(200).json({
            status: "FAILED",
            message: "No salon requests available.",
            data: [],
            pagination: {
                total: 0,
                page: filters.page || 1,
                limit: filters.limit || 10,
                totalPages: 0
            }
        });

    } catch (error) {
        console.error('❌ Error in getSalonRequestList:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};

module.exports = getSalonRequestList;
