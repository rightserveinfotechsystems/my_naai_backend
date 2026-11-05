const partnerPlanService = require('../../../services/partnerPlan.service');

/**
 * POST /api/salons/admin/plans/delete — admin.
 *
 * Body: { id, deactivate? }
 *
 * Refused while anybody is on the plan, unless `deactivate: true` is sent — which
 * takes it off sale and keeps it valid for the salons that already hold it. The
 * free trial can never be deleted: it is what a new partner starts on.
 */
const adminDeletePartnerPlan = async (request, response) => {
    try {
        const result = await partnerPlanService.remove(request.body || {});
        return response.status(200).json({
            status: 'SUCCESS',
            message: result.deleted
                ? 'Plan removed'
                : `Plan taken off sale — ${result.salons} salon${result.salons === 1 ? '' : 's'} keep their existing subscription`,
            data: result
        });
    } catch (error) {
        console.log('error=>>> adminDeletePartnerPlan', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message || 'Could not remove the plan'
        });
    }
};

module.exports = adminDeletePartnerPlan;
