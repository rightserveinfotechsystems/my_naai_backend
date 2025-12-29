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
      'string.pattern.base': 'bookingDate must be YYYY-MM-DD format (e.g. 2025-12-30)'
    }),
  amount: Joi.number().min(0).allow(null)
});

module.exports = { createBookingSchema };
