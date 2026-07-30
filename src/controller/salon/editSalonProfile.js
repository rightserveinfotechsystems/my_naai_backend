const salonService = require('../../services/salon.service')
const transactionService = require('../../services/transaction.service');
const { getAdminUserByPhone } = require('../../services/admin.service');
const db = require('../../database/models');
const { Service, BusinessHours, Barber, sequelize } = require('../../database/models');


const editSalonProfile = async (request, response) => {
    const t = await sequelize.transaction();
    try {
        const {
            salonId, salonName, ownerName, phoneNumber, addressLine1, addressLine2, agentCode, genderType, city, state, pincode,
            latitude, longitude, businessHours, services, existingServices = [], newServices = [], existingBarbers = [], newBarbers = [], imagesArray } = request.body;

        //check if salon exists
        const isSalonExist = await salonService.getSalonById(salonId);
        if (!isSalonExist) {
            return response.status(200).json({
                status: "FAILED",
                message: "Salon not found",
            });
        }

        let createdBy = null;
        if (agentCode) {
            const isAgentExist = await getAdminUserByPhone(agentCode);
            if (isAgentExist) {
                createdBy = isAgentExist?.id;
            } else {
                //add agent in db
                let agent = await db.Admin.create({
                    mobile: agentCode,
                    name: `Agent_${agentCode}`,
                    email: `${agentCode}@auto.com`,
                    password: "Pass123456",
                    isAdmin: false,
                    isAutoCreated: true,
                    accessTab: []
                },);

                createdBy = agent?.id;
            }
        }

        /* ---------------- Update Salon ---------------- */
        const salon = await salonService.updateSalon(salonId, {
            salonName: salonName || null,
            ownerName: ownerName || null,
            phoneNumber: phoneNumber || null,
            addressLine1: addressLine1 || null,
            addressLine2: addressLine2 || null,
            genderType: genderType || null,
            latitude: latitude || null,
            longitude: longitude || null,
            pincode: pincode || null,
            city: city || null,
            state: state || null,
            isPlanActive: true,
            createdBy,
            imageUrl: Array.isArray(imagesArray) && imagesArray.length > 0 ? imagesArray[0] : null,
            imagesArray: Array.isArray(imagesArray) && imagesArray.length > 0 ? imagesArray : null,
            isActive: true,
            isProfileCompleted: true
        }, t);



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
                        profileImageUrl: b.profileImageUrl,
                        ratingAverage: b.ratingAverage ?? 0,
                        isAvailable: b.isAvailable !== undefined ? b.isAvailable : true
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
                        ratingAverage: b.ratingAverage ?? 0,
                        isActive: true,
                        isAvailable: b.isAvailable !== undefined ? b.isAvailable : true
                    },
                    { transaction: t }
                );
            }
        }




        //update buisnesshours

        const oldBusinessHours = businessHours?.filter(bh => bh.scheduleId) || [];
        const newBusinessHours = businessHours?.filter(bh => !bh.scheduleId) || [];
        //create new business hours
        if (newBusinessHours.length > 0) {
            const businessHoursToCreate = newBusinessHours.map(bh => ({
                salonId: salon.salonId,
                openingTime: bh.openingTime || null,
                closingTime: bh.closingTime || null,
                breakStartTime: bh.breakStartTime || null,
                breakEndTime: bh.breakEndTime || null,
                holidayDays: bh.holidayDays || []
            }));
            await BusinessHours.bulkCreate(businessHoursToCreate, { transaction: t });
        }

        //update existing business hours
        if (Array.isArray(oldBusinessHours) && oldBusinessHours.length > 0) {
            for (const bh of oldBusinessHours) {

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


        await t.commit()
        /* ---------------- RESPONSE ---------------- */
        return response.status(200).json({
            status: "SUCCESS",
            message: "Salon Updated successfully",
        });

    } catch (error) {
        console.log('Error in editSalonProfile:', error);
        await t.rollback()
        return response.status(500).json({
            status: "FAILED",
            message: error.message,
        });
    }
};

module.exports = editSalonProfile;