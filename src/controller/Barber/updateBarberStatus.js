// controllers/barber/updateBarberStatus.controller.js
const barberService = require("../../services/barber.service");
const { updateBarberStatusSchema } = require("../../validations/barber.validation");

const updateBarberStatus = async (request, response) => {
  try {
    const { salonId, barberId, currentStatus, busyMinutes } = request.body;
    
    // Validation
    const { error } = updateBarberStatusSchema.validate(request.body);
    if (error) {
      return response.status(400).json({
        status: 'FAILED',
        message: error.details[0].message
      });
    }
    
    // Service call
    await barberService.updateBarberStatus(barberId, salonId, {
      currentStatus,
      busyMinutes
    });
    
    return response.status(200).json({
      status: 'SUCCESS',
      message: 'Barber status updated successfully'
    });
  } catch (error) {
    console.log("Update status error:", error);
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = updateBarberStatus;
