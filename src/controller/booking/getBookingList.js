const BookingService = require('../../services/booking.service');

const adminGetBookingList = async (request, response) => {
    try {
        // ✅ FIXED: Proper destructuring with defaults
        const { 
            page = 1, 
            searchString = '', 
            statusFilter = '', 
            salonFilter = '', 
            bookingDate = '', 
            limit 
        } = request.body || {};

        // ✅ Pass as object to service
        const result = await BookingService.adminListBookings({
            page,
            searchString,
            salonFilter, 
            statusFilter,
            bookingDate,
            limit
        });

        // Data found case
        if (result.totalBookings > 0 && result.bookings.length > 0) {
            return response.status(200).json({
                status: "SUCCESS",
                message: "Admin bookings fetched successfully",
                data: result.bookings,
                pagination: {
                    total: result.totalBookings,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        }

        // No data case
        return response.status(200).json({
            status: "FAILED",
            message: "No bookings available.",
            data: [],
            pagination: {
                total: 0,
                page,
                limit:20,
                totalPages: 0
            }
        });

    } catch (error) {
        console.error('Error in adminGetBookingList:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message || "Something went wrong!"
        });
    }
};

module.exports = adminGetBookingList;
