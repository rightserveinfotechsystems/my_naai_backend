
const { createBarberValidationSchema } = require('../../validations/barber.validation');
const barberService = require('../../services/barber.service');

const createBarber = async (request, response) => {
    try {
        const salonId = request.salon?.salonId;
        if (!salonId) {
            return response.status(403).json({
                status: 'FAILED',
                message: 'Salon ID not found in token'
            });
        }
    
        const { fullName, phoneNumber, email, profileImageUrl, specialization } = request.body || {};

        // Validation
        const validationResult = createBarberValidationSchema.validate({
            fullName, 
            phoneNumber,
            email, 
            profileImageUrl, 
            specialization
        }, { abortEarly: true });

        if (validationResult.error) {
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Phone check
        const validatePhone = validationResult.value.phoneNumber;
        const isBarberExist = await barberService.getBarberByPhoneNumber(validatePhone);
        if (isBarberExist) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Barber already exists with this phone number'
            });
        }

        const dataToInsert = {
            salonId: salonId, 
            fullName: validationResult.value.fullName.trim(),
            phoneNumber: validationResult.value.phoneNumber,
            email: validationResult.value.email?.toLowerCase().trim() || null,
            profileImageUrl: validationResult.value.profileImageUrl || null,
            specialization: validationResult.value.specialization || null,
            isActive: true,
            isAvailable: true
        };

        const result = await barberService.createBarber(dataToInsert);
        
        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Barber created successfully',
            data: {
                barberId: result.barberId,
                fullName: result.fullName,
                phoneNumber: result.phoneNumber
            }
        });

    } catch (error) {
        console.log("error", error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = createBarber;
