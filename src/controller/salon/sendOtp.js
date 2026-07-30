// controllers/salon/sendOtp.js
const salonService = require('../../services/salon.service');
const { generateOtp } = require('../../utils/middleware/otp.utils');
const { sendSalonOtpValidationSchema } = require('../../validations/salon.validation');
const db = require('../../database/models');
const axios = require('axios');

const sendSalonOtp = async (request, response) => {
  try {
    const { phoneNumber } = request.body || {};

    //  Validate
    const validationResult = sendSalonOtpValidationSchema.validate({ phoneNumber });
    if (validationResult.error) {
      return response.status(400).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }

    //  Check if salon exists
    // const salon = await salonService.getSalonByPhone(phoneNumber);
    // if (!salon) {
    //   return response.status(400).json({
    //     status: 'FAILED',
    //     message: 'Salon does not exist. Please contact admin.'
    //   });
    // }

    //  Generate OTP
    const otp = generateOtp(6);

    // send otp
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.SMS_SECRET_kEY
    };
    const newMessageResponse = await axios.post(`https://smsc.adservs.co.in/api/v1/gateway/sendSMS`, {
      number: [`91${phoneNumber}`],
      header: 'MYNAAI',
      message: `Welcome to My Naai ! Your login OTP is ${otp}. Please enter this to verify your account. MYNAAI`,
      templateid: '1707176788643020944',
      flash: false
    }, { headers });
    // const messageResponse = await axios.get(`https://sms.adservs.co.in/vb/apikey.php?apikey=${process.env.SMS_SECRET_kEY}&senderid=MYNAAI&number=${phoneNumber}&templateid=1707176788643020944&message=Welcome%20to%20My%20Naai%20!%20Your%20login%20OTP%20is%20${otp}.%20Please%20enter%20this%20to%20verify%20your%20account.%20MYNAAI`)
   
    if (newMessageResponse && newMessageResponse?.data?.success === true) {
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

module.exports = sendSalonOtp;
