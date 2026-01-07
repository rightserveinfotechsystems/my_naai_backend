const BookingService = require('../../services/booking.service');

const salonGetBookingList = async (request, response) => {
    try {
        
       const salonId = request.salon?.salonId;

        if (!salonId) {
            return response.status(400).json({
                status: "FAILED",
                message: "salonId not found in token. Login again."
            });
        }
        const {
            page = 1,
            date = '',
            statusFilter = '',
            searchString = '',
            limit
        } = request.body || {};

        const result = await BookingService.salonOwnerListBookings(salonId, {
            page,
            date,
            statusFilter,
            searchString,
            limit
        });

        if (result.totalBookings > 0 && result.bookings.length > 0) {
            return response.status(200).json({
                status: "SUCCESS",
                message: "Salon bookings fetched successfully",
                data: result.bookings,
                pagination: {
                    total: result.totalBookings,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages
                }
            });
        }

        return response.status(200).json({
            status: "FAILED",
            message: "No bookings available",
            data: [],
            pagination: {
                total: 0,
                page,
                limit: result.limit,
                totalPages: 1
            }
        });

    } catch (error) {
        console.error('Salon owner bookings error:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};

module.exports = salonGetBookingList;
