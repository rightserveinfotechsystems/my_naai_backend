const partnerPlanService = require('../../../services/partnerPlan.service');

/**
 * POST /api/salons/plans/list — PUBLIC.
 *
 * The registration screen shows prices before anybody has an account, so this
 * door has no token (the same reason `/salon-list-public` has none). It answers
 * only what a client renders: active plans, the free trial and its length.
 */
const listPartnerPlans = async (request, response) => {
    try {
        const catalog = await partnerPlanService.listPublic();
        return response.status(200).json({
            status: 'SUCCESS',
            data: catalog
        });
    } catch (error) {
        console.log('error=>>> listPartnerPlans', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message || 'Could not load the plans'
        });
    }
};

module.exports = listPartnerPlans;
