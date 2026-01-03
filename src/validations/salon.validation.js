const Joi = require('joi');

const registerSalonValidationSchema = Joi.object({
    fullName: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'Full name is required',
        'string.min': 'Full name must be at least 2 characters',
        'string.max': 'Full name cannot exceed 100 characters'
    })
    ,
    phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be between 10  digits and contain only numbers'
    }),
    salonName: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'Full name is required',
        'string.min': 'Full name must be at least 2 characters',
        'string.max': 'Full name cannot exceed 100 characters'
    }),
    address: Joi.string().min(5).max(255).required(),
    deviceToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Device token is required'
        }),
    otp: Joi.string()
        .trim()
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            'string.empty': 'OTP is required',
            'string.pattern.base': 'OTP must be exactly 4 digits',
            'any.required': 'OTP is required',
        }),
});

const sendSalonOtpValidationSchema = Joi.object({
    phoneNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required()
});

const verifySalonOtpValidationSchema = Joi.object({
    phoneNumber: Joi.string().trim().pattern(/^[0-9]{10}$/).required(),
    otp: Joi.string().pattern(/^[0-9]{6}$/).required(),
    deviceToken: Joi.string().max(255).required()
});

const salonIdValidationSchema = Joi.object({
    salonId: Joi.string().uuid().required(),
});

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
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX').required().messages({
        'any.only': 'Gender must be one of MALE, FEMALE, or UNISEX',
        'string.empty': 'Gender is required'
    }),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    imageUrl: Joi.string().allow(null, ''),
    isActive: Joi.boolean(),
    totalReviews: Joi.number().integer().min(0).optional(),
    ratingAverage: Joi.number().integer().min(0).max(5).optional(),
    imagesArray: Joi.array()  .items(
        Joi.string()
            .pattern(/\.jpe?g$|\.png$|\.webp$/i)  // jpg, jpeg, png, webp only
            .max(500)
            .required()
    ).min(1) .max(20).required().messages({
            'array.min': 'At least 1 image required',
            'array.max': 'Maximum 20 images allowed',
            'array.includes': 'All images must be valid URLs'
        }),
     

    //services
    services: Joi.array().items(
        Joi.object({
            serviceName: Joi.string().min(2).max(100).required(),
            description: Joi.string().allow(null, ''),
            durationMinutes: Joi.number().min(1).required(),
            price: Joi.number().min(0).required()
        })
    ).optional(),

    // businessHours
    businessHours: Joi.array().items(
        Joi.object({
            openingTime: Joi.string().required(),
            closingTime: Joi.string().required(),
            breakStartTime: Joi.string().allow(null),
            breakEndTime: Joi.string().allow(null),
            holidayDays: Joi.array().items(Joi.number().min(0).max(6)).default([])
        })
    ).optional(),
});

/**
 * Update salon validation schema
 */

const updateSalonValidationSchema = Joi.object({
    salonId: Joi.string().uuid().required(),
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
    imageUrl: Joi.string().allow(null, ''),
    imagesArray: Joi.array()
    .items(Joi.string().pattern(/\.jpe?g$|\.png$|\.webp$/i))
    .optional(),
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX').optional(),
    isActive: Joi.boolean(),
    totalReviews: Joi.number().integer().min(0).optional(),
    ratingAverage: Joi.number().integer().min(0).max(5).optional(),



    existingServices: Joi.array().items(
        Joi.object({
            serviceId: Joi.string().uuid().required(),
            serviceName: Joi.string().required(),
            durationMinutes: Joi.number().required(),
            price: Joi.number().min(0).required(),
            description: Joi.string().optional()
        })
    ).optional(),

    newServices: Joi.array().items(
        Joi.object({
            serviceName: Joi.string().required(),
            durationMinutes: Joi.number().required(),
            price: Joi.number().min(0).required(),
            description: Joi.string().optional()
        })
    ).optional(),



    // businessHours
    businessHours: Joi.array().items(Joi.object({
        scheduleId: Joi.string().uuid().required(),
        openingTime: Joi.string().required(),
        closingTime: Joi.string().required(),
        breakStartTime: Joi.string().allow(null),
        breakEndTime: Joi.string().allow(null),
        holidayDays: Joi.array().items(Joi.number().min(0).max(6)).default([])
    })
    ).optional(),
});


// update-salon for app
const updateSalonFieldsSchema = Joi.object({
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
    imageUrl: Joi.string().uri().allow(null, ''),
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX').required(),
});

const businessHourSchema = Joi.object({
    dayOfWeek: Joi.number().integer().min(0).max(6).required(),
    isOpen: Joi.boolean().required(),
    openingTime: Joi.string().allow(null, ''),
    closingTime: Joi.string().allow(null, ''),
    breakStartTime: Joi.string().allow(null, ''),
    breakEndTime: Joi.string().allow(null, ''),
});

const serviceSchema = Joi.object({
    serviceId: Joi.string().uuid().allow(null),
    serviceName: Joi.string().min(2).max(150).required(),
    durationMinutes: Joi.number().integer().min(1).required(),
    price: Joi.number().min(0).required(),
});


const updateSalonWithDetailsAppSchema = Joi.object({
    salonData: updateSalonFieldsSchema.optional(),
    businessHours: Joi.array().items(businessHourSchema).optional(),
    services: Joi.array().items(serviceSchema).optional(),
});


/**
 * Toggle status validation schema
 */
const toggleStatusValidationSchema = Joi.object({
    salonId: Joi.string().uuid().required(),
    isActive: Joi.boolean().required()
});

/**
 * Toggle open/close validation schema
 */
const toggleOpenCloseValidationSchema = Joi.object({
    salonId: Joi.string().uuid().required(),
    isOpen: Joi.boolean().required()
});



/**
 * salon service validation schema
 */
const salonServiceIdValidationSchema = Joi.object({
    serviceId: Joi.string().uuid().required()
});


module.exports = {
    createSalonValidationSchema,
    updateSalonValidationSchema,
    toggleStatusValidationSchema,
    toggleOpenCloseValidationSchema,
    sendSalonOtpValidationSchema,
    verifySalonOtpValidationSchema,
    salonIdValidationSchema,
    updateSalonWithDetailsAppSchema,
    registerSalonValidationSchema,
    salonServiceIdValidationSchema
};