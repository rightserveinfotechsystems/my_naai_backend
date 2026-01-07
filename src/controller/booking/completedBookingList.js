const { salonOwnerCompletedBookings } = require("../../services/booking.service");

const getCompletedBookings = async (req, res) => {
  try {
    const salonId = req.salon.salonId;
    const data = await salonOwnerCompletedBookings(salonId, req.body);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Completed bookings fetched',
      ...data
    });
  } catch (error) {
    res.status(400).json({
      status: 'FAILED',
      message: error.message
    });
  }
};
module.exports =  getCompletedBookings ;