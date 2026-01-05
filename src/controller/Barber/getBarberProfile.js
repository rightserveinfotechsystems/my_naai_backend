const { barberIdValidationSchema } = require("../../validations/barber.validation");
const barberService = require ("../../services/barber.service");


const getBarberProfile  = async (request, response) => {
  try {
    const barberId = request.barber.barberId; 
    

    if (!barberId) {
    return response.status(400).json({ message: 'barberId required' });
}

    // Validate userId
    const validationResult = await barberIdValidationSchema.validate(
      { barberId },
      { abortEarly: true }
    );
    if (validationResult.error) {
      return response.status(200).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message,
      });
    }
    
    const barber = await barberService.getBarberWithDetails(barberId);

    if (!barber) {
      return response.status(404).json({
        status: 'FAILED',
        message: 'Barber not found'
      });
    }

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'Barber retrieved successfully',
      data: barber
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = getBarberProfile;
