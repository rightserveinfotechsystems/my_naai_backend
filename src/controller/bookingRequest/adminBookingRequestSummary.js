const bookingRequestLeadService = require('../../services/bookingRequestLead.service');
const { resolveRange } = require('../../utils/istRange');

/**
 * The admin panel's counters and per-salon report.
 *
 * Body: `{ range?, fromDate?, toDate?, salonId? }`
 *
 * The window comes from the same helper the list uses (`utils/istRange`), and
 * defaults to TODAY like the list does. That is the whole point: the tiles and
 * the table below them answer for the same window, always. They used to have a
 * copy of this maths each, and they disagreed with the service that applied the
 * bounds — the tiles said "today" while the table showed all time.
 */
const adminBookingRequestSummary = async (request, response) => {
    try {
        const body = request.body || {};
        const { range, fromDate, toDate } = resolveRange(body);
        const { salonId } = body;

        const data = await bookingRequestLeadService.adminSummary({
            range,
            salonId: salonId || undefined,
            fromDate,
            toDate
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Booking request summary fetched successfully',
            data: { ...data, filters: { range, fromDate, toDate, salonId: salonId || null } }
        });
    } catch (error) {
        console.error('ADMIN BOOKING REQUEST SUMMARY ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = adminBookingRequestSummary;
