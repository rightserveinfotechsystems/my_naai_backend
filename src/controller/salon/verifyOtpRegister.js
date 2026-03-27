const salonService = require('../../services/salon.service');
const { verifySalonRegOtpValidationSchema } = require('../../validations/salon.validation');
const db = require('../../database/models');
const { DeviceToken } = db;


const verifySalonOtpRegister = async (request, response) => {
    try {
        const { phoneNumber, otp } = request.body || {};

        const validationResult = verifySalonRegOtpValidationSchema.validate({ phoneNumber, otp}, { abortEarly: true });
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }


        // Verify OTP
        const otpRow = await db.OtpLog.findOne({
            where: {
                phoneNumber: phoneNumber,
                otpCode: otp,
                purpose: 'registration',
                isVerified: false
            },
            order: [['createdAt', 'DESC']]
        });

        //OTP not found OR OTP does not match
        if (!otpRow || otpRow.otpCode !== otp) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Invalid OTP'
            });
        }


        //  OTP expired
        if (otpRow.expiresAt < new Date()) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'OTP has expired'
            });
        }


        //  Mark OTP as used
        await otpRow.update({
            isVerified: true,
            verifiedAt: new Date()
        });



        // Generate JWT token
        // const token = generateToken({
        //     salonId: salon.salonId,
          
        // });


        //delete the verified otp
        await db.OtpLog.destroy({
            where: {
                phoneNumber
            }
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Phone number verified successfuliy',
           
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = verifySalonOtpRegister;
