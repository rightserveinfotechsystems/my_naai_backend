const Joi = require('joi');


const createAdminValidationSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters'
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email'
    }),
    mobile: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'string.empty': 'Mobile number is required',
        'string.pattern.base': 'Mobile number must be 10 digits'
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters'
    }),
    role: Joi.string().valid('admin', 'super_admin').default('admin')
});

// Login validation schema

const loginValidationSchema = Joi.object({
    email: Joi.string().required().messages({
        'string.empty': 'Email or username is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    })
});

/**
 * Update admin validation schema
 */
const updateAdminValidationSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    mobile: Joi.string().pattern(/^[0-9]{10}$/),
    isActive: Joi.boolean()
});

/**
 * Change password validation schema
 */
const changePasswordValidationSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'string.empty': 'Current password is required'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.empty': 'New password is required',
        'string.min': 'New password must be at least 6 characters'
    }),
});

module.exports = {
    createAdminValidationSchema,
    loginValidationSchema,
    updateAdminValidationSchema,
    changePasswordValidationSchema
};