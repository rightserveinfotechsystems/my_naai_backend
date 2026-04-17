// controllers/booking.controller.js
const BookingService = require('../../services/booking.service');

const userGetBookingList = async (request, response) => {
  try {

    const userId  = request.user?.id;

    if (!userId) {
      return response.status(400).json({
        status: "FAILED",
        message: "userId not found in token."
      });
    }

    const { page = 1, date = '', statusFilter = '', limit } = request.body || {};

    const result = await BookingService.userListBookings(userId, {
      page, date, statusFilter, limit
    });

    // Format response
    const bookingsData = await Promise.all(
      result.bookings.map(async (booking) => {
        const services = booking.services || [];
console.log("SALON OBJECT:", booking.salon);
console.log("SALON KEYS:", booking.salon ? Object.keys(booking.salon) : null);
        const waitingTime =
          booking.queue?.queueNumber
            ? await BookingService.getUserWaitingTime(booking)
            : 0;
        return {
          bookingId: booking.bookingId,
          salonName: booking.salon?.salonName || '',
          salonCity: booking.salon?.city || '',
          salonImage: booking.salon?.imageUrl,
          // ✅ Correct key from JSON
          serviceName: services.map(s => s.name).join(', '),
          queueNumber: booking.queue?.queueNumber || null,
          queueStatus: booking.queue?.status || '',
          serviceDuration: services.reduce((sum, s) => sum + (s.duration || 0), 0),
          //waiting time
          waitingTimeInMinutes: waitingTime,
          waitingTimeDisplay: `${Math.floor(waitingTime / 60)}h ${waitingTime % 60}m`,


          amount: parseFloat(booking.amount || 0).toFixed(2),
          bookingDate: booking.bookingDate,
          bookingTime: booking.bookingTime,
          barberName: booking.barber?.fullName || '',
          status: booking.bookingStatus,
          bookingRequestId: booking.bookingRequestId 
        };
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