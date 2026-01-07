// controller/salon/getSalonById.app.js
const salonService = require('../../services/salon.service');
const { salonIdValidationSchema } = require('../../validations/salon.validation');

const getSalonByIdApp = async (request, response) => {
  try {
    const { salonId } = request.body || {};

    // Validate userId
    const validationResult = await salonIdValidationSchema.validate(
      { salonId },
      { abortEarly: true }
    );
    if (validationResult.error) {
      return response.status(200).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message,
      });
    }
    
    const salon = await salonService.getSalonWithDetails(salonId);

    if (!salon) {
      return response.status(404).json({
        status: 'FAILED',
        message: 'Salon not found'
      });
    }

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'Salon fetched successfully',
      data: salon
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = getSalonByIdApp;
