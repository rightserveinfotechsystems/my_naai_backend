// validations/barber.validation.js
const Joi = require('joi');

const createBarberValidationSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required()
        .messages({
            'string.min': 'Full name must be at least {#limit} characters',
            'string.max': 'Full name cannot exceed {#limit} characters',
            'any.required': 'Full name is required'
        }),

   phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
         'string.empty': 'phoneNumber number is required',
         'string.pattern.base': 'phoneNumber number must be 10 digits'
     }),

    email: Joi.string().email().allow(null, ''),
    profileImageUrl: Joi.string().uri().allow(null, ''),
    specialization: Joi.string().max(255).allow(null, ''),

    deviceToken: Joi.string()
        .max(255)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Device token too long'
        })
});

// validations/barber.validation.js
const sendBarberOtpValidationSchema = Joi.object({
  phoneNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required()
});

const verifyBarberOtpValidationSchema = Joi.object({
    phoneNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required(),
    otp: Joi.string().pattern(/^[0-9]{6}$/).required(),
    deviceToken: Joi.string().max(255).required()
});

module.exports = {
    createBarberValidationSchema,
    sendBarberOtpValidationSchema,
    verifyBarberOtpValidationSchema
};
