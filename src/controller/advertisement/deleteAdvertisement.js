const advertisementService = require('../../services/advertisement.service');
const { deleteAdvertisementSchema } = require('../../validations/advertisement.validation');

const deleteAdvertisement = async (request, response) => {
  try {
    //  Extract body
    const { advertisementId } = request.body || {};

    // Validate
    const validationResult = deleteAdvertisementSchema.validate(
      { advertisementId },
      {
        abortEarly: true,
        allowUnknown: false
      }
    );

    if (validationResult.error) {
      return response.status(400).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }

    //  Check advertisement exists
    const existingAd = await advertisementService.getAdvertisementById(advertisementId);

    if (!existingAd) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'Advertisement not found'
      });
    }

    // Delete advertisement
    await advertisementService.deleteAdvertisement(advertisementId);

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = deleteAdvertisement;
