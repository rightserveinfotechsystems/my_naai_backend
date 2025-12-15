const { createSalonValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service');


const createSalon = async (request, response) => {
    try {
        // Extract data from request body
        const salonData = request.body;

        // Validate input
        const validationResult = createSalonValidationSchema.validate(salonData, {
            abortEarly: true
        });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Prepare data to insert
        const dataToInsert = {
            salonName: salonData.salonName,
            ownerName: salonData.ownerName,
            phoneNumber: salonData.phoneNumber,
            email: salonData.email?.toLowerCase(),
            addressLine1: salonData.addressLine1,
            addressLine2: salonData.addressLine2,
            city: salonData.city,
            state: salonData.state,
            pincode: salonData.pincode,
            latitude: salonData.latitude,
            longitude: salonData.longitude,
            imageUrl: salonData.imageUrl,
            isActive: true,
            isOpen: false
        };

        // Create salon
        const salon = await salonService.createSalon(dataToInsert);

        if (salon) {
            return response.status(201).json({
                status: 'SUCCESS',
                message: 'Salon created successfully',
                data: salon
            });
        } else {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Failed to create salon, please try again!'
            });
        }
    } catch (error) {
        console.error('Error in createSalon:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = createSalon;