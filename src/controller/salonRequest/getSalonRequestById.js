// controller/salonRequest/getSalonRequestById.controller.js
const salonRequestService = require('../../services/salonrequest.service');
const { salonReqIdValidationSchema } = require('../../validations/salonreq.validation');

const getSalonRequestById = async (request, response) => {
  try {
    const { requestId } = request.body || {};

    // Validate requestId
    const validationResult = await salonReqIdValidationSchema.validate(
      { requestId },
      { abortEarly: true }
    );
    if (validationResult.error) {
      return response.status(400).json({ 
        status: 'FAILED',
        message: validationResult.error.details[0].message,
      });
    }
    
    const salonRequest = await salonRequestService.getSalonRequestById(requestId);

    if (!salonRequest) {
      return response.status(404).json({
        status: 'FAILED',
        message: 'Salon request not found'
      });
    }

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'Salon request fetched successfully',
      data: salonRequest
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = getSalonRequestById;
