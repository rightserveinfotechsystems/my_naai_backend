const Joi = require('joi');

const createBookingSchema = Joi.object({
  salonId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  // serviceId: Joi.string().uuid().required(),
  barberId: Joi.string().uuid().allow(null, ''),
   bookingDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)  // "2025-12-30" 
    .required()
     .messages({
    'date.min': 'bookingDate cannot be in the past!',
    'date.base': 'bookingDate must be a valid date in YYYY-MM-DD format',
    'string.pattern.base': 'bookingDate must be in YYYY-MM-DD format'
  }),
  bookingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).allow(null, '').optional()
  .messages({ 'string.pattern.base': 'Please enter bookingTime in 24-hour format HH:MM:SS (e.g., 12:00:00)',
    'any.required': 'bookingTime is required'}),
  amount: Joi.number().min(0).allow(null),
   serviceIds: Joi.array().items(Joi.string().uuid()).min(1).required()
});

  const completeBookingSchema = Joi.object({
  salonId: Joi.string().uuid().required(),
  bookingId: Joi.string().uuid().required()
});

const addWalkInSchema = Joi.object({
  customerName: Joi.string().trim().required().messages({
    'string.empty': 'customerName is required',
    'any.required': 'customerName is required'
  }),
  serviceDuration: Joi.number().integer().min(1).required().messages({
    'number.base': 'serviceDuration must be a number',
    'number.min': 'serviceDuration must be at least 1 minute',
    'any.required': 'serviceDuration is required'
  }),
    barberId: Joi.string().uuid().optional().messages({
    'any.required': 'barberId is required'
  })
});
module.exports = { 
  createBookingSchema,
  completeBookingSchema,
  addWalkInSchema
};