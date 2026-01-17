// controllers/booking.controller.js
const BookingService = require('../../services/booking.service');
const markBookingDone = async (request, response) => {
  try {
    const salonId = request.salon?.salonId || request.body.salonId;
    const { bookingId } = request.body;

    console.log('🔍 Complete service:', { salonId, bookingId });

    if (!salonId) {
      return response.status(404).json({
        status: "FAILED",
        message: "salonId not found in token"
      });
    }

        if ( !bookingId) {
      return response.status(400).json({
        status: "FAILED",
        message: "bookingId required"
      });
    }

    // ✅ Fetch booking to check date
    const booking = await BookingService.getBookingById(salonId, bookingId);
    if (!booking) {
      return response.status(404).json({
        status: "FAILED",
        message: "Booking not found"
      });
    }

    // Check if booking date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const bookingDate = new Date(booking.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);

    // If booking date is in the future, reject
    if (bookingDate > today) {
      return response.status(400).json({
        status: "FAILED",
        message: "You cannot complete future bookings"
      });
    }



    // ✅ CORRECT ORDER: salonId FIRST, bookingId SECOND
    const result = await BookingService.completeService(salonId, bookingId);


    return response.status(200).json({
      status: "SUCCESS",
      message: result.message,
      data: result
    });

  } catch (error) {
    console.error('Complete service error:', error);
    return response.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};


module.exports = markBookingDone;
