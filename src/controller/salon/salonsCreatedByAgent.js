const salonService = require('../../services/salon.service');

const getSalonsByAgent = async (request, response) => {
    try {
        const { agentId, page = 1, searchString = '' } = request.body;

        if (!agentId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Agent Id is required'
            });
        }

        const result = await salonService.getSalonsByAgent({ agentId, page, searchString });

        if (!result.salons || result.salons.length === 0) {
            return response.status(200).json({
                status: 'SUCCESS',
                message: 'No salons found for this agent',
                data: [],
                pagination: result?.pagination
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salons list fetched successfully',
            data: result.salons,
            pagination: result?.pagination
        });

    } catch (error) {
        console.error("Error fetching salons by agent:", error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = getSalonsByAgent;