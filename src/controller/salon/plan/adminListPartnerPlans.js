const partnerPlanService = require('../../../services/partnerPlan.service');

/**
 * POST /api/salons/admin/plans/list — admin.
 *
 * Every plan, including the inactive ones, with how many salons are on each.
 * That count is the point: deactivating a plan live salons sit on is the only
 * way this table can hurt a partner.
 */
const adminListPartnerPlans = async (request, response) => {
    try {
        const data = await partnerPlanService.listAdmin();
        return response.status(200).json({ status: 'SUCCESS', data });
    } catch (error) {
        console.log('error=>>> adminListPartnerPlans', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message || 'Could not load the plans'
        });
    }
};

module.exports = adminListPartnerPlans;
