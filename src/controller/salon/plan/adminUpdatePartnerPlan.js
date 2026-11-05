const partnerPlanService = require('../../../services/partnerPlan.service');

/**
 * POST /api/salons/admin/plans/update — admin.
 *
 * `id` only identifies the row. Everything a partner sees — label, price, days,
 * note, badge, whether it is recommended, its order, whether it is on sale — can
 * change, and the next price a client reads is this one.
 */
const adminUpdatePartnerPlan = async (request, response) => {
    try {
        const plan = await partnerPlanService.update(request.body || {});
        return response.status(200).json({
            status: 'SUCCESS',
            message: `"${plan.label}" updated`,
            data: { plan }
        });
    } catch (error) {
        console.log('error=>>> adminUpdatePartnerPlan', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message || 'Could not update the plan'
        });
    }
};

module.exports = adminUpdatePartnerPlan;
