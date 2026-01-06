const advertisementService = require('../../services/advertisement.service');
const {
    toggleStatusValidationSchema
} = require('../../validations/advertisement.validation');

const toggleAdvertisementStatus = async (request, response) => {
    try {
        // Extract body
        const { advertisementId, isActive } = request.body;


        const validationResult = toggleStatusValidationSchema.validate(
            { advertisementId, isActive },
            {
                abortEarly: true,
                allowUnknown: false
            }
        );

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        const validData = validationResult.value;

        //  Check advertisement exists
        const existingAd = await advertisementService.getAdvertisementById(validData.advertisementId);

        if (!existingAd) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Advertisement not found'
            });
        }

        // Update status
        await advertisementService.updateAdvertisement(
            validData.advertisementId,
            { isActive: validData.isActive }
        );

        return response.status(200).json({
            status: 'SUCCESS',
            message: `Advertisement ${validData.isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = toggleAdvertisementStatus;
