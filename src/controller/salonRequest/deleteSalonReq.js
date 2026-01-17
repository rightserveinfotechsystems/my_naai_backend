const salonRequestService = require("../../services/salonrequest.service");
const { deleteSalonReqValidationSchema } = require("../../validations/salonreq.validation");

const deleteSalonRequest = async (request, response) => {
    try {
        const { requestId, requestIds } = request.body || {};

        // ✅ Single delete
        if (requestId) {
            // Validate single requestId
            const { error } = deleteSalonReqValidationSchema.validate(request.body, { abortEarly: true });
            if (error) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: error.details[0].message,
                });
            }

            // Check request exist
            const isRequestExist = await salonRequestService.getSalonRequestById(requestId);
            if (!isRequestExist) {
                return response.status(404).json({
                    status: "FAILED",
                    message: "Salon request not found",
                });
            }

            // Delete single request
            const result = await salonRequestService.deleteSalonRequest(requestId);
            if (result) {
                return response.status(200).json({
                    status: "SUCCESS",
                    message: "Salon request deleted successfully",
                });
            } else {
                return response.status(400).json({
                    status: "FAILED",
                    message: "Failed to delete salon request, Please try again!",
                });
            }
        } 
        // ✅ Bulk delete
        else if (requestIds && Array.isArray(requestIds)) {
            // Manual validation
            if (!requestIds.every(id => typeof id === 'string' && id.length > 0)) {
                return response.status(400).json({
                    status: 'FAILED',
                    message: 'requestIds must be array of valid strings',
                });
            }

            // ✅ Extract actual IDs
            const actualIds = requestIds.map(id => 
                typeof id === 'object' && id.requestId ? id.requestId : id
            ).filter(Boolean);

            if (actualIds.length === 0) {
                return response.status(400).json({
                    status: "FAILED",
                    message: "No valid request IDs provided",
                });
            }

            // ✅ Check existing requests
            const existingRequests = await salonRequestService.getSalonRequestsByIds(actualIds);
            const nonExistingIds = actualIds.filter(id => 
                !existingRequests.some(request => request.requestId == id)
            );
            
            if (nonExistingIds.length > 0) {
                return response.status(404).json({
                    status: "FAILED",
                    message: `Salon requests not found: ${nonExistingIds.join(', ')}`,
                });
            }

            // Bulk delete
            const deletedCount = await salonRequestService.deleteSalonRequestsBulk(actualIds);
            
            return response.status(200).json({
                status: "SUCCESS",
                message: `${deletedCount} salon requests deleted successfully`,
                deletedCount,
                attempted: actualIds.length
            });
        } 
        // ✅ Neither provided
        else {
            return response.status(400).json({
                status: "FAILED",
                message: "Either requestId (single) or requestIds array is required",
            });
        }
    } catch (error) {
        console.error('Delete salon request error:', error);
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = deleteSalonRequest;
