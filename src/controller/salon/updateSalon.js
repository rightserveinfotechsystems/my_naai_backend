const { updateSalonValidationSchema } = require('../../validations/salon.validation');
const salonService = require('../../services/salon.service');
const { Service, BusinessHours, sequelize } = require('../../database/models');

const updateSalonAdmin = async (request, response) => {
    const t = await sequelize.transaction();

    try {

        const { salonId, services = [], businessHours = [], ...salonData } = request.body || {};

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
            longitude: salonData.longitude,
            imageUrl: salonData.imageUrl
        };

        await salon.update(dataToUpdate, { transaction: t });

        // update SERVICES 
        if (Array.isArray(services)) {
            for (const s of services) {
                if (s.serviceId) {
                    // Existing service → UPDATE
                    await Service.update(
                        {
                            serviceName: s.serviceName,
                            durationMinutes: s.durationMinutes,
                            price: Number(s.price),
                            description: s.description || null
                        },
                        {
                            where: { serviceId: s.serviceId, salonId },
                            transaction: t
                        }
                    );
                } else {
                    // New service → CREATE
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
        }

console.log('services in body:', services);

        //update buisnesshours
        if (Array.isArray(businessHours) && businessHours.length > 0) {
            for (const bh of businessHours) {
                if (bh.scheduleId) {
                    await BusinessHours.update(
                        {
                            openingTime: bh.openingTime,
                            closingTime: bh.closingTime,
                            breakStartTime: bh.breakStartTime || null,
                            breakEndTime: bh.breakEndTime || null,
                            holidayDays: bh.holidayDays || []
                        },
                        {
                            where: { scheduleId: bh.scheduleId, salonId },
                            transaction: t
                        }
                    );
                } else {
                    await BusinessHours.create(
                        {
                            salonId,
                            openingTime: bh.openingTime,
                            closingTime: bh.closingTime,
                            breakStartTime: bh.breakStartTime || null,
                            breakEndTime: bh.breakEndTime || null,
                            holidayDays: bh.holidayDays || []
                        },
                        { transaction: t }
                    );
                }
            }
        }

        await t.commit();


        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const formattedHolidayDays = businessHours?.holidayDays?.map(d => dayNames[d]) || [];

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
