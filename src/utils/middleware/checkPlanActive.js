const { isPlanActive } = require("../plan.util");

const checkPlanActive = async (request, response, next) => {
  try {
    const salon = request.salon;

    if (!salon) {
      return response.status(401).json({
        status: "FAILED",
        message: "Unauthorized or not loaded"
      });
    }

    // if (!isPlanActive(salon.planEndDate)) {
    //   return response.status(403).json({
    //     status: "FAILED",
    //     message: "Your plan has expired. Please renew."
    //   });
    // }

    if (!salon.isPlanActive) {
      return response.status(403).json({
        status: "PLAN_EXPIRED",
        message: "Your plan is finished, please renew"
      });
    }

    next();
  } catch (error) {
    return response.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};
module.exports = checkPlanActive;
