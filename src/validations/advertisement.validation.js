const Joi = require("joi");

// Create Advertisement validation
const createAdvertisementSchema = Joi.object({
   title: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.empty": "Title is required",
      "string.min": "Title is too short"
    }),

  images: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      "array.base": "Images must be an array of URLs",
      "array.min": "At least one image is required",
      "any.required": "Images field is required",
      "string.uri": "Each image must be a valid URL",
    }),
});
const updateAdvertisementSchema = Joi.object({
  advertisementId: Joi.string().uuid().required(),
  title: Joi.string().trim().min(3).max(255).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
//   status: Joi.string().valid('active', 'inactive').optional(),
//   startDate: Joi.date().optional(),
//   endDate: Joi.date().optional()
});

const toggleStatusValidationSchema = Joi.object({
  advertisementId: Joi.string().uuid().required(),
  status: Joi.string().valid('active', 'inactive').required()
});

module.exports = {
  createAdvertisementSchema,
  updateAdvertisementSchema,
  toggleStatusValidationSchema
};
