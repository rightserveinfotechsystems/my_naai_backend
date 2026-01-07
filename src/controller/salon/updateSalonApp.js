const { updateSalonValidationSchemaApp } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service');
const { Service, BusinessHours, Barber, sequelize } = require('../../database/models');

const updateSalonApp = async (request, response) => {
    const t = await sequelize.transaction();

    try {

        const { salonId, existingServices = [], newServices = [], businessHours = [], existingBarbers = [],newBarbers = [], ...salonData } = request.body || {};

        // salonId check
        if (!salonId) {
            await t.rollback();
            return response.status(400).json({
                status: 'FAILED',
                message: 'salonId is required'
            });
        }

        // Validate input 
        const validationResult = updateSalonValidationSchemaApp.validate(request.body, {
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

        // UPDATE EXISTING BARBERS
        if (Array.isArray(existingBarbers) && existingBarbers.length > 0) {
            for (const b of existingBarbers) {
                if (!b.barberId) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: 'barberId is required for existingBarbers'
                    });
                }

                const [affected] = await Barber.update(
                    {
                        fullName: b.fullName,
                        profileImageUrl: b.profileImageUrl
                    },
                    {
                        where: { barberId: b.barberId, salonId },
                        transaction: t
                    }
                );

                if (!affected) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: `Invalid barberId in existingBarbers: ${b.barberId}`
                    });
                }
            }
        }

        // CREATE NEW BARBERS
        if (Array.isArray(newBarbers) && newBarbers.length > 0) {
            for (const b of newBarbers) {
                if (b.barberId) {
                    await t.rollback();
                    return response.status(400).json({
                        status: 'FAILED',
                        message: 'barberId must NOT be sent in newBarbers'
                    });
                }

                await Barber.create(
                    {
                        salonId,
                        fullName: b.fullName,
                        profileImageUrl: b.profileImageUrl,
                        isActive: true,
                        isAvailable: true
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

module.exports = updateSalonApp;