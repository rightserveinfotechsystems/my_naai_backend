  const Joi = require('joi');
  const createSalonReqValidationSchema = Joi.object({
    fullName: Joi.string().min(2).max(100).required().messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters'
    }),
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be exactly 10 digits'
    }),
    salonName: Joi.string().min(2).max(100).required().messages({  
      'string.empty': 'Salon name is required',                
      'string.min': 'Salon name must be at least 2 characters',  
      'string.max': 'Salon name cannot exceed 100 characters'    
    }),
    address: Joi.string().min(5).max(255).required().messages({
      'string.empty': 'Address is required',
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 255 characters'
    }),
      city: Joi.string().valid('Katol', 'Warud').required()
  });

  const salonReqIdValidationSchema = Joi.object({
  requestId: Joi.string().uuid().required().messages({
    'string.empty': 'Request ID is required',
    'string.guid': 'Request ID must be a valid UUID',
    'any.required': 'Request ID is required'
  })
});



  const deleteSalonReqValidationSchema = Joi.object({
      requestId: Joi.string().uuid().optional(),
      requestIds: Joi.array().items(Joi.string().uuid()).optional()
  }).xor('requestId', 'requestIds')  // ✅ EXACTLY ONE REQUIRED
      .required(); 

  module.exports = {
    createSalonReqValidationSchema,
    salonReqIdValidationSchema,
    deleteSalonReqValidationSchema
  };