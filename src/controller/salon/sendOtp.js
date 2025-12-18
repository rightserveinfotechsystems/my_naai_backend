// controllers/salon/sendOtp.js
const salonService = require('../../services/salon.service');
const { generateOtp } = require('../../utils/middleware/otp.utils');
const { sendSalonOtpValidationSchema } = require('../../validations/salon.validation');
const db = require('../../database/models');

const sendSalonOtp = async (request, response) => {
  try {
    const { phoneNumber } = request.body|| {};

    //  Validate
    const validationResult = sendSalonOtpValidationSchema.validate({ phoneNumber });
    if (validationResult.error) {
      return response.status(400).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }

    //  Check if salon exists
    const salon = await salonService.getSalonByPhone(phoneNumber);
    if (!salon) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'Salon does not exist. Please contact admin.'
      });
    }

    //  Generate OTP
    const otp = generateOtp(6);

    //  Save OTP in DB
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otpLog = await db.OtpLog.create({
      phoneNumber,
      otpCode: otp,
      purpose: 'login',   
      expiresAt
    });

    if (!otpLog) {
      return response.status(500).json({
        status: 'FAILED',
        message: 'Failed to generate OTP, please try again'
      });
    }

    //  Response
    return response.status(200).json({
      status: 'SUCCESS',
      message: 'OTP sent successfully',
      otp 
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = sendSalonOtp;
