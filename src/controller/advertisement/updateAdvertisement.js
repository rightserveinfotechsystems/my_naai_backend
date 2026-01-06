const advertisementService = require('../../services/advertisement.service');
const { updateAdvertisementSchema } = require('../../validations/advertisement.validation');

const updateAdvertisement = async (request, response) => {
    try {
        const { advertisementId, title, images } = request.body || {};


        const validationResult = updateAdvertisementSchema.validate(
                { advertisementId, title, images },
                {
                    abortEarly: true,
                }
            );
        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Check advertisement exists
        const existingAd = await advertisementService.getAdvertisementById(advertisementId);

        if (!existingAd) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Advertisement not found'
            });
        }

        const updatedAd = await advertisementService.updateAdvertisement(advertisementId, {
            title: validationResult.value.title,
            images: validationResult.value.images
        });

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Advertisement updated successfully',
            data: updatedAd
        });
    } catch (error) {
        console.error('Error in updateAdvertisementAdmin:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = updateAdvertisement;
