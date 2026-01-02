// controllers/booking.controller.js
const BookingService = require('../../services/booking.service');
const { userBookingListSchema } = require('../../validations/booking.validation');

const userGetBookingList = async (request, response) => {
  try {

    const {userId} = request.body || {}; 
     const { error, value } = userBookingListSchema.validate(request.body);
    if (error) {
      return response.status(400).json({
        status: "FAILED",
        message: error.details[0].message
      });
    }
    
    if (!userId) {
      return response.status(400).json({
        status: "FAILED",
        message: "userId not found."
      });
    }

    const {
      page = 1,
      date = '',
      statusFilter = '',
      limit
    } = request.body || {};

    const result = await BookingService.userListBookings(userId, {
      page, date, statusFilter, limit
    });

    // Format response
    const bookingsData = result.bookings.map(booking => ({
      bookingId: booking.bookingId,
      salonName: booking.salon?.salonName || '',
      salonCity: booking.salon?.city || '',   
      serviceName: booking.service?.serviceName || '',
      queueNumber: booking.queue?.queueNumber || null,
      queueStatus: booking.queue?.status || '',
      serviceDuration: booking.service?.durationMinutes || 0,
      amount: parseFloat(booking.amount || 0).toFixed(2),
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      status: booking.bookingStatus
   
    }));

    return response.status(200).json({
      status: "SUCCESS",
      message: "User bookings fetched successfully",
      data: bookingsData,
      pagination: {
        total: result.totalBookings,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });

  } catch (error) {
    console.error(' User bookings error:', error);
    return response.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};
module.exports = userGetBookingList;