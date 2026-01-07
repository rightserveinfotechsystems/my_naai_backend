// controllers/booking.controller.js
const BookingService = require('../../services/booking.service');

const addWalkInCustomers = async (req, res) => {
  try {
    const { salonId, count, services } = req.body;

    const result = await BookingService.createWalkInCustomers({
      salonId,
      count,
      services
    });

    return res.status(200).json({
      status: 'SUCCESS',
      message: result.message,
      data: result.bookings
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'FAILED',
      message: err.message
    });
  }
};

module.exports = addWalkInCustomers ;
