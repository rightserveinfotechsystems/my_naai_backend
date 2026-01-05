const { updateSalonValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service');
const { Service, BusinessHours, sequelize } = require('../../database/models');

const updateSalonAdmin = async (request, response) => {
    const t = await sequelize.transaction();

    try {

        const { salonId, existingServices = [], newServices = [], businessHours = [], ...salonData } = request.body || {};

        // salonId check
        if (!salonId) {
            await t.rollback();
            return response.status(400).json({
                status: 'FAILED',
                message: 'salonId is required'
            });
        }

        // Validate input 
        const validationResult = updateSalonValidationSchema.validate(request.body, {
            abortEarly: true
        });

        if (validationResult.error) {
            await t.rollback();
            return response.status(400).json({
                status: 'FAILED',
                message: validationResult.error.details[0].message
            });
        }

        // Find existing salon
        const salon = await salonService.getSalonById(salonId);
        if (!salon) {
            await t.rollback();
            return response.status(404).json({
                status: 'FAILED',
                message: 'Salon not found'
            });
        }

        // UPDATE SALON BASIC FIELDS
        const dataToUpdate = {
            salonName: salonData.salonName,
            ownerName: salonData.ownerName,
            phoneNumber: salonData.phoneNumber,
            email: salonData.email?.toLowerCase(),
            addressLine1: salonData.addressLine1,
            addressLine2: salonData.addressLine2,
            city: salonData.city,
            genderType: salonData.genderType || salon.genderType,
            state: salonData.state,
            pincode: salonData.pincode,
            latitude: salonData.latitude,
            ratingAverage: parseFloat(salonData.ratingAverage) || 0.00,
            totalReviews: Number(salonData.totalReviews) || 0,
            longitude: salonData.longitude,
            imageUrl: salonData.imagesArray[0],
            imagesArray: salonData?.imagesArray,
            isActive: salonData.isActive
        };

        await salon.update(dataToUpdate, { transaction: t });

        //  UPDATE EXISTING SERVICES ONLY
        if (Array.isArray(existingServices) && existingServices.length > 0) {
            for (const s of existingServices) {
                if (!s.serviceId) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: 'serviceId is required for existingServices'
                    });
                }

                const [affected] = await Service.update(
                    {
                        serviceName: s.serviceName,
                        durationMinutes: s.durationMinutes,
                        price: Number(s.price),
                        description: s.description
                    },
                    {
                        where: { serviceId: s.serviceId, salonId },
                        transaction: t
                    }
                );

                if (!affected) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: `Invalid serviceId in existingServices: ${s.serviceId}`
                    });
                }
            }
        }

        // CREATE NEW SERVICES ONLY 
        if (Array.isArray(newServices) && newServices.length > 0) {
            for (const s of newServices) {
                if (s.serviceId) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: 'serviceId must NOT be sent in newServices'
                    });
                }

                await Service.create(
                    {
                        salonId,
                        serviceName: s.serviceName,
                        durationMinutes: s.durationMinutes,
                        price: Number(s.price),
                        description: s.description || null,
                        isActive: true,
                        displayOrder: 0
                    },
                    { transaction: t }
                );
            }
        }

        //update buisnesshours
        if (Array.isArray(businessHours) && businessHours.length > 0) {
            for (const bh of businessHours) {
                if (!bh.scheduleId) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: 'scheduleId is required for businessHours update'
                    });
                }

                const [affected] = await BusinessHours.update(
                    {
                        openingTime: bh.openingTime,
                        closingTime: bh.closingTime,
                        breakStartTime: bh.breakStartTime || null,
                        breakEndTime: bh.breakEndTime || null,
                        holidayDays: Array.isArray(bh.holidayDays) ? bh.holidayDays : []
                    },
                    {
                        where: {
                            scheduleId: bh.scheduleId,
                            salonId
                        },
                        transaction: t
                    }
                );

                // wrong id
                if (!affected) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: `Invalid scheduleId for business hour: ${bh.scheduleId}`
                    });
                }
            }
        }



        await t.commit();

        const updatedSalon = await salonService.getSalonWithDetails(salonId);

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Salon updated successfully',
            data: updatedSalon
        });

    } catch (error) {
        await t.rollback();
        console.error('Error in updateSalonAdmin:', error);
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = updateSalonAdmin;
