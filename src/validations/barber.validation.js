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
  ratingAverage: Joi.number()
    .min(0)
    .max(5)
    .precision(2)
    .optional(),

  profileImageUrl: Joi.string().optional()
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

// const updateBarberStatusSchema = Joi.object({
//     barberId: Joi.string().uuid().required(), 
//   currentStatus: Joi.string()
//     .valid('available', 'busy', 'break')
//     .required()
//     .messages({
//       'any.only': 'Status must be available, busy, or break'
//     }),
//   estimatedFinishTime: Joi.string()
//     .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
//     .optional()
//     .allow(null)
//     .messages({
//       'string.pattern.base': 'Invalid time format (HH:MM:SS)'
//     }),
//     currentStatus: Joi.string().valid('available', 'busy', 'break').required(),
//   busyMinutes: Joi.number().integer().min(0).max(240).required()  // 0-4 hours
// });
const updateBarberStatusSchema = Joi.object({
  salonId: Joi.string().uuid().required(),
  barberId: Joi.string().uuid().required(),
  currentStatus: Joi.string().valid('available', 'busy', 'break').required(),
  busyMinutes: Joi.number().integer().min(0).max(240).required()  
});


module.exports = {
    createBarberValidationSchema,
    sendBarberOtpValidationSchema,
    verifyBarberOtpValidationSchema,
    barberIdValidationSchema,
    updateBarberValidationSchema,
    toggleStatusValidationSchema,
    toggleAvailabilityValidationSchema,
    updateBarberStatusSchema
};
