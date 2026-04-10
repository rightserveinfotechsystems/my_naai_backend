const userService = require("../../services/user.service");

const getSaveSalonListController = async (request, response) => {
  try {
    const saveSalons = await userService.getSaveSalonList();
    if (saveSalons && saveSalons.length > 0) {
      return response.status(200).json({
        status: 'SUCCESS',
        data: saveSalons
      })
    } else {
      return response.status(200).json({
        status: 'SUCCESS',
        message: 'No saved salons found',
        data: []
      });
    }
  } catch (error) {
    // console.log('ERROR:', error.message);
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = { getSaveSalonListController };