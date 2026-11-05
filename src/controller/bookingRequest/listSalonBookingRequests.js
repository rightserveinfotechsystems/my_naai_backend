const bookingRequestLeadService = require('../../services/bookingRequestLead.service');

/**
 * The salon's Booking requests tab: every lead this salon received, newest
 * first, with what became of it.
 *
 * Body: `{ salonId?, status?, page?, limit?, fromDate?, toDate? }`
 * `salonId` is optional and, when sent, MUST be the caller's own salon — a
 * mismatched id is a 403, never a silent switch to the caller's own data (that
 * would hide a bug in the client behind a page that looks right).
 *
 * Requests are not bookings: nothing here reads `booking`/`booking_list`, and
 * the accept path's `bookingId` pointer is the only reference to one.
 */
const listSalonBookingRequests = async (request, response) => {
    try {
        const { salonId, status, page, limit, fromDate, toDate } = request.body || {};
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

        const data = await bookingRequestLeadService.listSalonLeads({
            salonId: ownSalonId,
            status: status || 'ALL',
            page,
            limit,
            fromDate,
            toDate
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Booking requests fetched successfully',
            data
        });
    } catch (error) {
        console.error('LIST SALON BOOKING REQUESTS ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = listSalonBookingRequests;
