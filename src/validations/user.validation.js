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
module.exports = {
    createUserValidationSchema
};