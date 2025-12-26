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

//salonIdValidationSchema
const barberIdValidationSchema = Joi.object({
    barberId: Joi.string().uuid().required(),
});

//update Barber
const updateBarberValidationSchema = Joi.object({
  barberId: Joi.string().uuid().required()
    .messages({
      'any.required': 'barberId is required',
      'string.guid': 'barberId must be a valid UUID'
    }),

  phoneNumber: Joi.string().trim().pattern(/^[0-9]+$/).max(10)
    .messages({
      'string.pattern.base': 'Phone number must contain only numbers',
      'string.min': 'Phone number must be between 10 digits',
      'string.max': 'Phone number must be between 10 digits'
    }),
  fullName: Joi.string().trim().min(2).max(100).optional()
    .messages({
      'string.min': 'Full name must be between 2 and 100 characters',
      'string.max': 'Full name must be between 2 and 100 characters'
    }),

  email: Joi.string().trim().lowercase().email().optional()
    .messages({
      'string.email': 'Must be a valid email address'
    }),

  profileImageUrl: Joi.string()
    .uri().optional()
});

/**
 * Toggle status validation schema
 */
const toggleStatusValidationSchema = Joi.object({
    barberId: Joi.string().uuid().required(),
    isActive: Joi.boolean().required()
});

/**
 * Toggle Available validation schema
 */
const toggleAvailabilityValidationSchema = Joi.object({
    barberId: Joi.string().uuid().required(),
    isAvailable: Joi.boolean().required()
});



module.exports = {
    createBarberValidationSchema,
    sendBarberOtpValidationSchema,
    verifyBarberOtpValidationSchema,
    barberIdValidationSchema,
    updateBarberValidationSchema,
    toggleStatusValidationSchema,
    toggleAvailabilityValidationSchema
};
