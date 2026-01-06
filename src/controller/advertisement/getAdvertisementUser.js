const advertisementService = require('../../services/advertisement.service');

const getAdvertisementUser = async (request, response) => {
  try {
    const advertisement = await advertisementService.getActiveAdvertisementForUser();

    if (advertisement) {
      return response.status(200).json({
        status: 'SUCCESS',
        message: 'Active advertisement fetched successfully',
        data: advertisement
      });
    } else {
      return response.status(200).json({
        status: 'FAILED',
        message: 'No active advertisement available',
        data: []
      });
    }
  } catch (error) {
    console.error('Error in getAdvertisementUser:', error);
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = {
  getAdvertisementUser
};
