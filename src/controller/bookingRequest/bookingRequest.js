// controllers/booking/createBookingRequest.js
const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const createBookingRequest = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;
        const { salonId, barberId, services, bookingDate, bookingTime } = req.body || {};

        // ----------------------------
        // 1️⃣ Basic validation
        // ----------------------------
        if (!salonId || !services?.length || !bookingDate || !bookingTime) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Required fields missing'
            });
        }

        // ----------------------------
        // 2️⃣ Fetch services from DB
        // ----------------------------
        const serviceRecords = await db.Service.findAll({
            where: { serviceId: { [Op.in]: services } }
        });

        if (serviceRecords.length !== services.length) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid service selected'
            });
        }

        const servicesPayload = serviceRecords.map(s => ({
            serviceId: s.serviceId,
            name: s.serviceName,
            duration: s.durationMinutes,
            price: s.price
        }));

        const totalDuration = servicesPayload.reduce((sum, s) => sum + s.duration, 0);
        if (totalDuration <= 0) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid service duration'
            });
        }

        // ----------------------------
        // 3️⃣ Slot availability check
        // ----------------------------
        const endTimeQuery = `
      booking_time < (TIME '${bookingTime}' + INTERVAL '${totalDuration} minutes')
      AND
      (booking_time + INTERVAL '${totalDuration} minutes') > TIME '${bookingTime}'
    `;

        const slotConflict = await db.Booking.findOne({
            where: {
                salonId,
                barberId: barberId || { [Op.ne]: null },
                bookingDate,
                bookingStatus: 'confirmed',
                [Op.and]: db.sequelize.literal(endTimeQuery)
            }
        });

        if (slotConflict) {
            return res.status(409).json({
                status: 'FAILED',
                message: 'Selected slot is no longer available'
            });
        }


        // Calculate endTime by adding totalDuration minutes to startTime
        const [hours, minutes] = bookingTime.split(':').map(Number);
        let endHours = hours + Math.floor((minutes + totalDuration) / 60);
        let endMinutes = (minutes + totalDuration) % 60;
        endHours = endHours % 24; // handle next day if needed
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        // ----------------------------
        // 4️⃣ Create BookingRequest
        // ----------------------------
        const bookingRequest = await db.BookingRequest.create(
            {
                customerId: userId,
                salonId,
                barberId: barberId || null,
                serviceIds: servicesPayload,
                bookingDate,
                startTime: bookingTime,
                endTime: endTime,
                status: 'PENDING',
                delayMinutes: null
            },
            { transaction: t }
        );

        // ----------------------------
        // 5️⃣ Push Notification to Salon Owner
        // ----------------------------
        // const user = await db.User.findByPk(userId, { attributes: ['name'] });
        const user = await db.User.findByPk(userId, { attributes: ['fullName'] });
        const userName = user ? user.fullName : 'Customer';
        const serviceNames = servicesPayload.map(s => s.name).join(', ');

        await sendNotificationToDevice({
            userType: 'SALON_OWNER',
            salonId,
            title: 'New Booking Request',
            body: `${userName} requested a booking at ${bookingTime} on ${bookingDate} for ${serviceNames}`,
            data: {
                bookingRequestId: bookingRequest.bookingRequestId,
                type: 'BOOKING_REQUEST'
            }
        });

        await t.commit();

        return res.status(201).json({
            status: 'SUCCESS',
            message: 'Booking request sent to salon owner',
            data: bookingRequest
        });

    } catch (error) {
        await t.rollback();
        console.error('CREATE BOOKING REQUEST ERROR:', error);

        return res.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = {
    createBookingRequest
};