// controllers/barber/sendOtp.js
const barberService = require('../../services/barber.service')
const { generateOtp } = require('../../utils/middleware/otp.utils');
const db = require('../../database/models');
const { sendBarberOtpValidationSchema } = require('../../validations/barber.validation');

const sendBarberOtp = async (request, response) => {
  try {
    const { phoneNumber } = request.body || {};

    //  Validate
    const validationResult = sendBarberOtpValidationSchema.validate({ phoneNumber });
    if (validationResult.error) {
      return response.status(400).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }

    //  Check if barber exists
    const barber = await barberService.getBarberByPhoneNumber(phoneNumber);
    if (!barber) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'Barber does not exist. Please contact salon admin.'
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

module.exports = sendBarberOtp;
