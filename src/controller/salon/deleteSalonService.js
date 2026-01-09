const salonService = require("../../services/salon.service");
const { salonServiceIdValidationSchema } = require("../../validations/salon.validation");

const deleteSalonService = async (request, response) => {
    try {
        const { serviceId, salonId } = request.body || {};


        if (serviceId) {
            // Validate single serviceId
            const { error } = salonServiceIdValidationSchema.validate(request.body, { abortEarly: true });
            if (error) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: error.details[0].message,
                });
            }

            // Check service exist (via service layer)
            const existingService = await salonService.getServiceById(serviceId);
            if (!existingService) {
                return response.status(404).json({
                    status: "FAILED",
                    message: "Service not found",
                });
            }

            // ✅ Delete using SERVICE LAYER
            const result = await salonService.deleteSalonService(serviceId);
            if (result) {
                return response.status(200).json({
                    status: "SUCCESS",
                    message: "Salon service deleted successfully",
                    data: {
                        deletedServiceId: serviceId,
                        serviceName: existingService.serviceName,
                        salonId: existingService.salonId || salonId
                    }
                });
            } else {
                return response.status(500).json({
                    status: "FAILED",
                    message: "Failed to delete service, Please try again!",
                });
            }
        }
        // Neither provided
        else {
            return response.status(400).json({
                status: "FAILED",
                message: "serviceId is required",
            });
        }
    } catch (error) {
        console.error('Delete salon service error:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = deleteSalonService;
