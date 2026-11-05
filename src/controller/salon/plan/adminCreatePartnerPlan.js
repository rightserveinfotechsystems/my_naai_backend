const partnerPlanService = require('../../../services/partnerPlan.service');

/**
 * POST /api/salons/admin/plans/create — admin.
 *
 * Body: { id?, label, price, days, note?, badge?, isRecommended?, sortOrder? }
 * `id` is optional on create and permanent once written: `salons.planType`
 * stores it, so a rename must never move a partner onto a different plan.
 */
const adminCreatePartnerPlan = async (request, response) => {
    try {
        const plan = await partnerPlanService.create(request.body || {});
        return response.status(200).json({
            status: 'SUCCESS',
            message: `"${plan.label}" is on sale now`,
            data: { plan }
        });
    } catch (error) {
        console.log('error=>>> adminCreatePartnerPlan', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message || 'Could not create the plan'
        });
    }
};

module.exports = adminCreatePartnerPlan;
