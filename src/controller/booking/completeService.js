// controllers/booking.controller.js
const BookingService = require('../../services/booking.service');
const completeService = async (request, response) => {
  try {
    const salonId = request.salon?.salonId || request.body.salonId;
    const { bookingId } = request.body;

    console.log('🔍 Complete service:', { salonId, bookingId });  

    if (!salonId || !bookingId) {
      return response.status(400).json({
        status: "FAILED",
        message: "salonId and bookingId required"
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
    console.error('❌ Complete service error:', error);
    return response.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};


module.exports = { completeService };
