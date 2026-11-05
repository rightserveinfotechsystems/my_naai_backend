const bookingRequestLeadService = require('../../services/bookingRequestLead.service');

/**
 * The admin panel's Booking requests tab: every lead on the platform, with the
 * salon it went to and how fast that salon answered.
 *
 * Body: `{ salonId?, status?, search?, page?, limit?, fromDate?, toDate? }`
 * `search` matches the customer's name, the customer's phone and the salon's
 * name — the three things somebody on a support call knows.
 *
 * Read-only: an admin does not accept or reject on a salon's behalf. Conversion
 * happens when the salon accepts, and a second path would produce two bookings
 * for one customer.
 *
 * Requests only: this never joins `booking` / `booking_list` for a count. A row
 * carries `bookingId` when the salon accepted, and that is the link.
 */
const adminListBookingRequests = async (request, response) => {
    try {
        const { salonId, status, search, page, limit, fromDate, toDate } = request.body || {};

        const data = await bookingRequestLeadService.listAdminLeads({
            salonId: salonId || undefined,
            status: status || 'ALL',
            search,
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
        console.error('ADMIN LIST BOOKING REQUESTS ERROR:', error);
        return response.status(error.status || 500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = adminListBookingRequests;
