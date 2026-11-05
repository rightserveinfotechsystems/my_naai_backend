const bookingRequestLeadService = require('../../services/bookingRequestLead.service');

/**
 * The salon's lead counters — the tiles the Booking requests tab leads with.
 *
 * Body: `{ salonId?, range? }` where range is TODAY | WEEK | MONTH | ALL.
 *
 * `autoCancelled` and `rejected` are separate numbers on purpose (missed leads
 * are a staffing problem, rejected ones a pricing/capacity answer), and a
 * customer's own cancellation is a third bucket. `answerRate` is
 * `(accepted + rejected) / received`; the buckets add up to `received`.
 */
const salonBookingRequestSummary = async (request, response) => {
    try {
        const { salonId, range = 'ALL', fromDate, toDate } = request.body || {};
        const ownSalonId = request.salon?.salonId;

        if (!ownSalonId) {
            return response.status(401).json({ status: 'FAILED', message: 'Not authorized' });
        }
        if (salonId && String(salonId) !== String(ownSalonId)) {
            return response.status(403).json({
                status: 'FAILED',
                message: 'You can only read your own booking requests'
            });
        }

        const data = await bookingRequestLeadService.salonSummary({
            salonId: ownSalonId,
            range,
            fromDate,
            toDate
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Booking request summary fetched successfully',
            data
        });
    } catch (error) {
        console.error('SALON BOOKING REQUEST SUMMARY ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = salonBookingRequestSummary;
