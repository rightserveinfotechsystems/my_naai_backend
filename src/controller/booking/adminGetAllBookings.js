const BookingService = require('../../services/booking.service');

const adminGetAllBookings = async (request, response) => {
    try {
        // No pagination or search params needed
        const result = await BookingService.adminListAllBookings({});

        // Data found case
        if (result.totalBookings > 0 && result.bookings.length > 0) {
            return response.status(200).json({
                status: "SUCCESS",
                message: "Admin bookings fetched successfully",
                data: result.bookings
            });
        }

        // No data case
        return response.status(200).json({
            status: "FAILED",
            message: "No bookings available.",
            data: []
        });

    } catch (error) {
        console.error('Error in adminGetAllBookings:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message || "Something went wrong!"
        });
    }
};

module.exports = adminGetAllBookings;
