const BookingService = require('../../services/booking.service');
const { addWalkInSchema } = require('../../validations/booking.validation');

const addWalkInCustomers = async (request, response) => {
  try {
    // ✅ salonId token se le rahe hain
    const salonId = request.salon?.salonId;
   if (!salonId) {
      return response.status(401).json({ 
        status: 'FAILED', 
        message: 'Salon owner not logged in or token is invalid. Please login again.' 
      });
    }

    const { customerName, serviceDuration } = request?.body || {};

   // ✅ Validate input
    const validationResult = addWalkInSchema.validate({customerName, serviceDuration}, { abortEarly: true });

    if (validationResult.error) {
      return response.status(400).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }  

    // ✅ Call service
    const result = await BookingService.addWalkInCustomer({
      salonId,
      customerName,
      serviceDuration
    });

    return response.status(200).json({
      status: 'SUCCESS',
      message: result.message,
      data: {
        queue: result.queue,
        totalDuration: result.totalDuration
      }
    });

  } catch (err) {
    console.error(err);
    return response.status(500).json({
      status: 'FAILED',
      message: err.message
    });
  }
};

module.exports = addWalkInCustomers;
