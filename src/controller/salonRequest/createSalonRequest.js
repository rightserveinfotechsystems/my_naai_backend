// controllers/salonRequest/createSalonRequest.controller.js

const salonRequestService = require("../../services/salonrequest.service");
const {createSalonReqValidationSchema} = require("../../validations/salonreq.validation");


const createSalonRequest = async (req, res) => {
  try {
    const { fullName, salonName, phoneNumber, address } = req.body || {};

    // Validate Input
    const { error, value } = createSalonReqValidationSchema.validate(
      { fullName, salonName, phoneNumber: phoneNumber?.toString(), address },
      { abortEarly: true }
    );

    if (error) {
      return res.status(400).json({
        status: "FAILED",
        message: error.details[0].message,
      });
    }

    const validData = value;

    //  Check if request exists by phone
    const exists = await salonRequestService.getByPhone(validData.phoneNumber);
    if (exists) {
      return res.status(400).json({
        status: "FAILED",
        message: "Request already exists with this phone number",
      });
    }

    // Prepare Data
    const insertData = {
      fullName: validData.fullName || null,
      salonName: validData.salonName || null,
      phoneNumber: validData.phoneNumber.trim(),
      address: validData.address || null
    };

    // Create Request via Service
    const savedRequest = await salonRequestService.create(insertData);

    return res.status(200).json({
      status: "SUCCESS",
      message: "Salon request submitted successfully",
      data: savedRequest,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "FAILED",
      message: err.message,
    });
  }
};

module.exports = createSalonRequest;
