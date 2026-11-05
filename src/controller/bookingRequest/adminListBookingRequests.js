const bookingRequestLeadService = require('../../services/bookingRequestLead.service');
const { resolveRange } = require('../../utils/istRange');

/**
 * The admin panel's Booking requests table.
 *
 * Body: `{ range?, fromDate?, toDate?, status?, salonId?, search?, page?, limit? }`
 *
 * ── What was wrong with it ───────────────────────────────────────────────
 * The panel sent `range: 'TODAY'` and this endpoint ignored it unless the
 * caller ALSO sent `fromDate`/`toDate`, so the default was `ALL`: the tiles said
 * "today" and the table underneath listed every request the platform had ever
 * taken. Both are now resolved here, from one helper, for the list and the
 * summary alike — a tab can no longer show two different windows at once.
 *
 * `range` is echoed back in `filters` so the panel can print the window it is
 * actually looking at instead of assuming the one it asked for.
 *
 * ── Volume ───────────────────────────────────────────────────────────────
 * Every filter is applied in SQL before LIMIT/OFFSET, the order is stable
 * (`created_at DESC, booking_request_id DESC`, so paging cannot repeat or skip a
 * row), and `statusCounts` gives the chip row its numbers from the same window
 * — so a platform with tens of thousands of leads is a page of 25 plus one
 * GROUP BY, not a download.
 */
const adminListBookingRequests = async (request, response) => {
    try {
        const body = request.body || {};
        const { range, fromDate, toDate } = resolveRange(body);
        const { salonId, status, search, page, limit } = body;

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
            data: {
                ...data,
                filters: {
                    range,
                    fromDate,
                    toDate,
                    status: status || 'ALL',
                    salonId: salonId || null,
                    search: String(search || '').trim()
                }
            }
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
