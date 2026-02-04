const { createSalonValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service');
const { Service, BusinessHours, sequelize } = require('../../database/models');
const db = require('../../database/models');

const createSalon = async (request, response) => {
    const t = await db.sequelize.transaction();
    try {
        const admin = request.admin
        // Extract data from request body
        const { services = [], businessHours, ...salonData } = request.body || {};


        // Validate input
        const validationResult = createSalonValidationSchema.validate({ ...salonData, services, businessHours }, {
            abortEarly: true,
            stripUnknown: true

        });

        if (validationResult.error) {
            await t.rollback();
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Phone number unique check
        const existingByPhone = await salonService.getSalonByPhone(salonData.phoneNumber);
        if (existingByPhone) {
            await t.rollback();
            return response.status(400).json({
                status: 'FAILED',
                message: 'Salon with this phone number already exists'
            });
        }

        // Email unique check(optional)
        if (salonData.email) {
            const existingByEmail = await salonService.getSalonByEmail(salonData.email.toLowerCase());
            if (existingByEmail) {
                await t.rollback();
                return response.status(400).json({
                    status: 'FAILED',
                    message: 'Salon with this email already exists'
                });
            }
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
            genderType: salonData.genderType || 'UNISEX',
            state: salonData.state,
            pincode: salonData.pincode,
            ratingAverage: parseFloat(salonData.ratingAverage) || 0.00,
            totalReviews: Number(salonData.totalReviews) || 0,
            latitude: salonData.latitude,
            longitude: salonData.longitude,
            imageUrl: salonData.imagesArray[0],
            imagesArray: salonData?.imagesArray,
            isActive: true,
            isOpen: false,
            createdBy: admin?.id || null
        };

        // Create salon
        const salon = await salonService.createSalon(dataToInsert, t);

        // Create Services
        if (services.length > 0) {
            const servicesToCreate = services.map(service => ({
                salonId: salon.salonId,
                serviceName: service.serviceName,
                description: service.description || null,
                durationMinutes: service.durationMinutes,
                price: Number(service.price),
                isActive: true,
                displayOrder: 0
            }));
            await Service.bulkCreate(servicesToCreate, { transaction: t });
        }

        // Create Business Hours
        if (businessHours.length > 0) {
            const businessHoursToCreate = businessHours.map(bh => ({
                salonId: salon.salonId,
                openingTime: bh.openingTime || null,
                closingTime: bh.closingTime || null,
                breakStartTime: bh.breakStartTime || null,
                breakEndTime: bh.breakEndTime || null,
                holidayDays: bh.holidayDays || []
            }));
            await BusinessHours.bulkCreate(businessHoursToCreate, { transaction: t });
        }

        await t.commit();


        // if (salon) {
        //     return response.status(201).json({
        //         status: 'SUCCESS',
        //         message: 'Salon created successfully',
        //         data: salon
        //     });
        // } else {
        //     return response.status(400).json({
        //         status: 'FAILED',
        //         message: 'Failed to create salon, please try again!'
        //     });
        // }

        const createdSalon = await salonService.getSalonWithDetails(salon.salonId);
        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon created successfully',
            data: createdSalon
        });
    } catch (error) {
        await t.rollback();
        console.error('Error in createSalon:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = createSalon;