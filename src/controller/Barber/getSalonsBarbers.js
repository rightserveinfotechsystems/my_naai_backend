// controllers/barber/getSalonBarbers.controller.js
const barberService = require('../../services/barber.service')

const getSalonBarbers = async (req, res) => {
  try {
    const salonId = req.salon?.salonId;

    if (!salonId) {
      return res.status(401).json({
        status: 'FAILED',
        message: 'Salon id not found in token.'
      });
    }

    const barbers = await barberService.getSalonBarbers(salonId);

    return res.json({
      status: 'SUCCESS',
      data: barbers
    });

  } catch (err) {
    return res.status(500).json({
      status: 'FAILED',
      message: err.message
    });
  }
};

module.exports = getSalonBarbers;
