const advertisementService = require('../../services/advertisement.service');
const { createAdvertisementSchema } = require('../../validations/advertisement.validation');
const createAdvertisement = async (request, response) => {
  try {

  const advertisementData = request.body;

if (!advertisementData || Object.keys(advertisementData).length === 0) {
  return response.status(400).json({
    status: 'FAILED',
    message: 'Advertisement data is required'
  });
}

    // ✅ DB create
     const advertisement = await advertisementService.createAdvertisement(request.body);

    return response.status(200).json({
      status: 'SUCCESS',
      message: 'Advertisement created successfully',
      data: advertisement
    });

  } catch (error) {
    console.error('Create Advertisement Error:', error);
    return response.status(500).json({
      status: 'FAILED',
      message: error.message || 'Internal server error'
    });
  }
};


module.exports = createAdvertisement;
