const bookingRequestLeadService = require('../../services/bookingRequestLead.service');

const getDateRange = (range = "ALL") => {
    const now = new Date();

    // Current date in IST
    const istDate = new Date(
        now.getTime() + 5.5 * 60 * 60 * 1000
    );

    // IST midnight represented as UTC timestamp
    const todayStart = Date.UTC(
        istDate.getUTCFullYear(),
        istDate.getUTCMonth(),
        istDate.getUTCDate()
    ) - (5.5 * 60 * 60 * 1000);

    let fromDate = null;
    let toDate = null;

    switch (range) {
        case "TODAY":
            fromDate = new Date(todayStart);
            toDate = new Date(todayStart + 86400000);
            break;

        case "WEEK":
            fromDate = new Date(todayStart - 6 * 86400000);
            toDate = new Date(todayStart + 86400000);
            break;

        case "MONTH":
            fromDate = new Date(todayStart - 29 * 86400000);
            toDate = new Date(todayStart + 86400000);
            break;

        case "ALL":
        default:
            break;
    }

    return { fromDate, toDate };
};

const adminListBookingRequests = async (request, response) => {
    try {
        const { salonId, status, search, page, limit, range } = request.body || {};
        const { fromDate, toDate } = getDateRange(range);
        console.log("range", range, fromDate, toDate)
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
