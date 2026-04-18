const userService = require("../../services/user.service");

const getUserBookedSalonsController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        status: "FAILED",
        message: "userId not found"
      });
    }

    const salons = await userService.getUserBookedSalons(userId);

    return res.status(200).json({
      status: "SUCCESS",
      message: "User booked salons fetched successfully",
      data: salons
    });

  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};

module.exports = { getUserBookedSalonsController };