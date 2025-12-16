const Joi = require('joi');

const createUserValidationSchema = Joi.object({
    fullName: Joi.string().min(2).max(100).required().messages({   
        'string.empty': 'Full name is required',
        'string.min': 'Full name must be at least 2 characters',
        'string.max': 'Full name cannot exceed 100 characters' 
})
,
    phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be between 10 and 15 digits and contain only numbers' 
    }),
    email: Joi.string().email().allow(null, '').messages({
        'string.email': 'Please provide a valid email'
    }),
     profileImageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Profile image URL must be a valid URL'
    }),
 deviceToken: Joi.string()
  .required()
  .messages({
    'any.required': 'Device token is required'
  })
});

// validations/user.validation.js
const sendOtpValidationSchema = Joi.object({
    phoneNumber: Joi.string().trim().pattern(/^[0-9]+$/).min(10).max(15).required()
});

const verifyOtpValidationSchema = Joi.object({
    phoneNumber: Joi.string().trim().pattern(/^[0-9]+$/).min(10).max(15).required(),
    otp: Joi.string().length(6).required(),
    deviceToken: Joi.string().max(255).optional()
});


const updateUserValidationSchema = Joi.object({
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^[0-9]+$/)
    .min(10)
    .max(15)
    .messages({
      'string.pattern.base': 'Phone number must contain only numbers',
      'string.min': 'Phone number must be between 10 and 15 digits',
      'string.max': 'Phone number must be between 10 and 15 digits'
    }),
     fullName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Full name must be between 2 and 100 characters',
      'string.max': 'Full name must be between 2 and 100 characters'
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .messages({
      'string.email': 'Must be a valid email address'
    }),

  profileImageUrl: Joi.string()
    .uri(),

  deviceToken: Joi.string()
    .max(255)
});

module.exports = {
    createUserValidationSchema,
    sendOtpValidationSchema,
    verifyOtpValidationSchema,
    updateUserValidationSchema
};