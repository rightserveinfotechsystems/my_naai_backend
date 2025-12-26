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
    imageUrl: Joi.string().uri().allow(null, ''),

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
            // dayOfWeek: Joi.number().integer().min(0).max(6).required(),
            dayType: Joi.string().valid('weekdays', 'sunday').required(),
            isOpen: Joi.boolean().default(true),
            openingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
            closingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
            breakStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
            breakEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
        })
    ).optional()
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
    imageUrl: Joi.string().uri().allow(null, ''),
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
            dayOfWeek: Joi.number().integer().min(0).max(6).required(),
            isOpen: Joi.boolean().required(),
            openingTime: Joi.string().allow(null),
            closingTime: Joi.string().allow(null),
            breakStartTime: Joi.string().allow(null),
            breakEndTime: Joi.string().allow(null)
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
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    imageUrl: Joi.string().uri().allow(null, ''),
    genderType: Joi.string().valid('MALE', 'FEMALE', 'UNISEX'),
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



module.exports = {
    createSalonValidationSchema,
    updateSalonValidationSchema,
    toggleStatusValidationSchema,
    toggleOpenCloseValidationSchema,
    sendSalonOtpValidationSchema,
    verifySalonOtpValidationSchema,
    salonIdValidationSchema,
    updateSalonWithDetailsAppSchema
};