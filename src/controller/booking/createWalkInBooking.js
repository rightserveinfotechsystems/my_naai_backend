const BookingService = require('../../services/booking.service');

const addWalkInController = async (request, response) => {
  try {
    const { salonId, count } = request.body;

    if (!salonId) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'salonId is required'
      });
    }

    const result = await BookingService.addWalkInCustomers({ salonId, count });

    return response.status(200).json({
      status: 'SUCCESS',
      message: result.message,
      data: result.queues
    });
  } catch (err) {
    console.error(err);
    return response.status(500).json({
      status: 'FAILED',
      message: err.message
    });
  }
};

module.exports = addWalkInController;
