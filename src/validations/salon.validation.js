const Joi = require('joi');

/**
 * Create salon validation schema
 */
const createSalonValidationSchema = Joi.object({
    salonName: Joi.string().min(2).max(150).required().messages({
        'string.empty': 'Salon name is required',
        'string.min': 'Salon name must be at least 2 characters',
        'string.max': 'Salon name cannot exceed 150 characters'
    }),
    ownerName: Joi.string().min(2).max(100).allow(null, ''),
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be 10 digits'
    }),
    email: Joi.string().email().allow(null, ''),
    addressLine1: Joi.string().min(5).max(255).required().messages({
        'string.empty': 'Address is required'
    }),
    addressLine2: Joi.string().max(255).allow(null, ''),
    city: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'City is required'
    }),
    state: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'State is required'
    }),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).required().messages({
        'string.empty': 'Pincode is required',
        'string.pattern.base': 'Pincode must be 6 digits'
    }),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    imageUrl: Joi.string().uri().allow(null, '')
});

/**
 * Update salon validation schema
 */
const updateSalonValidationSchema = Joi.object({
    salonName: Joi.string().min(2).max(150),
    ownerName: Joi.string().min(2).max(100).allow(null, ''),
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/),
    email: Joi.string().email().allow(null, ''),
    addressLine1: Joi.string().min(5).max(255),
    addressLine2: Joi.string().max(255).allow(null, ''),
    city: Joi.string().min(2).max(100),
    state: Joi.string().min(2).max(100),
    pincode: Joi.string().pattern(/^[0-9]{6}$/),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    imageUrl: Joi.string().uri().allow(null, '')
});

/**
 * Toggle status validation schema
 */
const toggleStatusValidationSchema = Joi.object({
    isActive: Joi.boolean().required().messages({
        'any.required': 'Status is required'
    })
});

/**
 * Toggle open/close validation schema
 */
const toggleOpenCloseValidationSchema = Joi.object({
    isOpen: Joi.boolean().required().messages({
        'any.required': 'Open/Close status is required'
    })
});

module.exports = {
    createSalonValidationSchema,
    updateSalonValidationSchema,
    toggleStatusValidationSchema,
    toggleOpenCloseValidationSchema
};