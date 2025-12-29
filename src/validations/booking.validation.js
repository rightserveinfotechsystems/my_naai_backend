const Joi = require('joi');

const createBookingSchema = Joi.object({
  salonId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  serviceId: Joi.string().uuid().required(),
  barberId: Joi.string().uuid().allow(null, ''),
   bookingDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)  // "2025-12-30" format
    .required()
     .messages({
    'date.min': 'bookingDate cannot be in the past!',
    'date.base': 'bookingDate must be a valid date in YYYY-MM-DD format'
  }),
  amount: Joi.number().min(0).allow(null)
});

module.exports = { createBookingSchema };
