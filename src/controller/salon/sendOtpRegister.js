// controllers/salon/sendOtp.js

const { generateOtp } = require('../../utils/middleware/otp.utils');
const db = require('../../database/models');
const axios = require('axios');
const { sendRegSalonOtpValidationSchema } = require('../../validations/salon.validation');
const salonService = require ('../../services/salon.service')


const sendRegisterSalonOtp = async (request, response) => {
  try {
    const { phoneNumber } = request.body || {};

    //  Validate
    const validationResult = sendRegSalonOtpValidationSchema.validate({ phoneNumber });
    if (validationResult.error) {
      return response.status(400).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }

    //  Check if salon exists
    const salon = await salonService.getSalonByPhone(phoneNumber);
    if (salon) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'Salon Already exists.'
      });
    }

    //  Generate OTP
    const otp = generateOtp(6);

    // send otp

    const messageResponse = await axios.get(`https://sms.adservs.co.in/vb/apikey.php?apikey=${process.env.SMS_SECRET_kEY}&senderid=MYNAAI&number=${phoneNumber}&templateid=1707176788643020944&message=Welcome%20to%20My%20Naai%20!%20Your%20login%20OTP%20is%20${otp}.%20Please%20enter%20this%20to%20verify%20your%20account.%20MYNAAI`)
    if (messageResponse && messageResponse?.data?.status?.toLowerCase() === "success") {
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
      });
    } else {
      return response.status(200).json({
        status: 'FAILED',
        message: 'Failed to send otp, Please try again'
      });
    }

  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = sendRegisterSalonOtp;
