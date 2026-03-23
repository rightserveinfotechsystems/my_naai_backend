const Joi = require('joi');
const sendNotificationToUserAndSalon = Joi.object({
    targetType: Joi.string().valid("ALL", "ALL_USERS", "ALL_SALONS").required().messages({
        "any.only": "targetType must be ALL, ALL_USERS or ALL_SALONS",
        "string.empty": "targetType is required"
    }),
    title: Joi.string().required(),
    body: Joi.string().required(),
    data: Joi.string().optional()
});

const deleteNotificationIdValidationSchema = Joi.object({
    notificationId: Joi.string().uuid().required()
})
const getNotificationByIdValidationSchema = Joi.object({
    notificationId: Joi.string().uuid().required()
})

module.exports = {
    sendNotificationToUserAndSalon,
    deleteNotificationIdValidationSchema,
    getNotificationByIdValidationSchema
}