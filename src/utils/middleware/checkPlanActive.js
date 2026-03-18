const db = require("../../database/models");

const checkPlanActive = async (req, res, next) => {
  try {
    const salonId = req.salon?.salonId;

    if (!salonId) {
      return res.status(401).json({
        status: "FAILED",
        message: "Unauthorized"
      });
    }

    const salon = await db.Salon.findByPk(salonId);

    if (!salon) {
      return res.status(404).json({
        status: "FAILED",
        message: "Salon not found"
      });
    }

    const today = new Date();

    const isPlanActive =
      salon.planEndDate && new Date(salon.planEndDate) >= today;

    if (!isPlanActive) {
      return res.status(403).json({
        status: "FAILED",
        message: "Your plan has expired. Please renew."
      });
    }

    next();

  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};

module.exports = { checkPlanActive };