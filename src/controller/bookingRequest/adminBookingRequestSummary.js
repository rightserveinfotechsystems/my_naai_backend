const bookingRequestLeadService = require('../../services/bookingRequestLead.service');

/**
 * The admin panel's lead report: platform counters plus the per-salon table
 * ("which salons get leads and which of them let them die").
 *
 * Body: `{ range?, salonId?, fromDate?, toDate? }`
 *
 * The per-salon rows are sorted worst-first by `autoCancelled`, and
 * `medianResponseSeconds` is null for a salon that never answered (the panel
 * shows a dash — a zero would read as an instant reply).
 */
const adminBookingRequestSummary = async (request, response) => {
    try {
        const { range = 'ALL', salonId, fromDate, toDate } = request.body || {};

        const data = await bookingRequestLeadService.adminSummary({
            range,
            salonId: salonId || undefined,
            fromDate,
            toDate
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Booking request summary fetched successfully',
            data
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
