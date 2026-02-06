const Joi = require('joi');

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
    phoneNumber: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .allow(null, '')
        .required()
        .messages({
            'string.empty': 'Phone number cannot be empty',
            'string.pattern.base': 'Phone number must be 10 digits'
        }),
    email: Joi.string().email().allow(null, ''),
    addressLine1: Joi.string().min(5).max(255).optional().allow(null, ''),
    addressLine2: Joi.string().max(255).optional().allow(null, ''),
    city: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'City is required'
    }),
    state: Joi.string().min(2).max(100).required().messages({
        'string.empty': 'State is required'
    }),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).allow(null, '').optional().messages({
        'string.empty': 'Pincode is required',
        'string.pattern.base': 'Pincode must be 6 digits'
    }),
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX').required().messages({
        'any.only': 'Gender must be one of MALE, FEMALE, or UNISEX',
        'string.empty': 'Gender is required'
    }),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    imageUrl: Joi.string().allow(null, ''),
    isActive: Joi.boolean(),
    totalReviews: Joi.number().integer().min(0).optional(),
    ratingAverage: Joi.number().precision(1).min(0).max(5).optional(),
    imagesArray: Joi.array().items(
        Joi.string()
            .pattern(/\.jpe?g$|\.png$|\.webp$/i)  // jpg, jpeg, png, webp only
            .max(500)
            .optional()
    ).max(20).optional().messages({
        'array.max': 'Maximum 20 images allowed',
        'array.includes': 'All images must be valid URLs'
    }),


    //services
    services: Joi.array().items(
        Joi.object({
            serviceName: Joi.string().min(2).max(100).required(),
            description: Joi.string().allow(null, ''),
            durationMinutes: Joi.number().min(1).required(),
            price: Joi.number().min(0).optional()
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
    ).required(),
});

/**
 * Update salon validation schema
 */

const updateSalonValidationSchema = Joi.object({
    salonId: Joi.string().uuid().required(),
    salonName: Joi.string().min(2).max(150).optional(),
    ownerName: Joi.string().min(2).max(100).allow(null, ''),
    phoneNumber: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .allow(null, '')
        .required()
        .messages({
            'string.empty': 'Phone number cannot be empty',
            'string.pattern.base': 'Phone number must be 10 digits'
        }),
    email: Joi.string().email().allow(null, ''),
    addressLine1: Joi.string().min(5).max(255).optional().allow(null, ''),
    addressLine2: Joi.string().max(255).allow(null, ''),
    city: Joi.string().min(2).max(100),
    state: Joi.string().min(2).max(100),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).optional().allow(null, ''),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    imageUrl: Joi.string().allow(null, ''),
    imagesArray: Joi.array()
        .items(Joi.string().pattern(/\.jpe?g$|\.png$|\.webp$/i))
        .optional(),
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX').optional(),
    isActive: Joi.boolean(),
    totalReviews: Joi.number().integer().min(0).optional(),
    ratingAverage: Joi.number().precision(1).min(0).max(5).optional(),



    existingServices: Joi.array().items(
        Joi.object({
            serviceId: Joi.string().uuid().required(),
            serviceName: Joi.string().required(),
            durationMinutes: Joi.number().required(),
            price: Joi.number().min(0).optional(),
            description: Joi.string().optional()
        })
    ).optional(),

    newServices: Joi.array().items(
        Joi.object({
            serviceName: Joi.string().required(),
            durationMinutes: Joi.number().required(),
            price: Joi.number().min(0).optional(),
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

const updateSalonValidationSchemaApp = Joi.object({
    salonId: Joi.string().uuid().required(),
    salonName: Joi.string().min(2).max(150),
    ownerName: Joi.string().min(2).max(100).allow(null, ''),
    // phoneNumber: Joi.string().pattern(/^[0-9]{10}$/),
    email: Joi.string().email().allow(null, ''),
    addressLine1: Joi.string().min(5).max(255).allow(null, '').optional(),
    addressLine2: Joi.string().max(255).allow(null, '').optional(),
    city: Joi.string().min(2).max(100).optional(),
    state: Joi.string().min(2).max(100),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).optional().allow(null, ''),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    imageUrl: Joi.string().allow(null, ''),
    imagesArray: Joi.array()
        .items(Joi.string().pattern(/\.jpe?g$|\.png$|\.webp$/i))
        .optional(),
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX').optional(),
    isActive: Joi.boolean(),
    totalReviews: Joi.number().integer().min(0).optional(),
    ratingAverage: Joi.number().precision(1).min(0).max(5).optional(),



    existingServices: Joi.array().items(
        Joi.object({
            serviceId: Joi.string().uuid().required(),
            serviceName: Joi.string().required(),
            durationMinutes: Joi.number().required(),
            price: Joi.number().min(0).optional(),
            description: Joi.string().optional()
        })
    ).optional(),

    newServices: Joi.array().items(
        Joi.object({
            serviceName: Joi.string().required(),
            durationMinutes: Joi.number().required(),
            price: Joi.number().min(0).optional(),
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

    //barbers
    existingBarbers: Joi.array().items(
        Joi.object({
            barberId: Joi.string().uuid().required(),
            fullName: Joi.string().optional(),
            profileImageUrl: Joi.string().allow(null, ''),
            ratingAverage: Joi.number().precision(1).min(0).max(5).optional(),
            isAvailable: Joi.boolean().optional()
        })
    ).optional(),

    newBarbers: Joi.array().items(
        Joi.object({
            fullName: Joi.string().required(),
            profileImageUrl: Joi.string().allow(null, ''),
            ratingAverage: Joi.number().precision(1).min(0).max(5).optional(),
            isAvailable: Joi.boolean().optional()
        })
    ).optional()
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
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
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
    updateSalonValidationSchemaApp,
    salonServiceIdValidationSchema
};