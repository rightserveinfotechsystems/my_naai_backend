// controllers/booking/createBookingRequest.js
const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');


// 24-hour time (HH:mm) to 12-hour format with AM/PM
function formatTimeToAMPM(time24) {
    let [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// YYYY-MM-DD to DD/MM/YYYY
function formatDateDMY(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

const createBookingRequest = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;
        const { salonId, barberId, services, bookingDate, bookingTime } = req.body || {};

        // ----------------------------
        // 1️⃣ Basic validation
        // ----------------------------
        if (!salonId || !services?.length || !bookingDate || !bookingTime) {
            await t.rollback();
            return res.status(400).json({
                status: 'FAILED',
                message: 'Required fields missing'
            });
        }

        // ✅ Date validation: only today + 2 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const allowedDates = [0, 1, 2].map(d => {
            const dt = new Date(today);
            dt.setDate(today.getDate() + d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        });
        if (!allowedDates.includes(bookingDate)) {
            await t.rollback();
            return res.status(400).json({ status: 'FAILED', message: 'Booking allowed only for 3 days' });
        }

        // ----------------------------
        // 2️⃣ Fetch services from DB
        // ----------------------------
        const serviceRecords = await db.Service.findAll({
            where: { serviceId: { [Op.in]: services } }
        });

        if (serviceRecords.length !== services.length) {
            await t.rollback();
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
            await t.rollback();
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid service duration'
            });
        }

        // ----------------------------
        // 3️⃣ Slot availability check
        // ----------------------------
        // Calculate end time in HH:MM
        const [hours, minutes] = bookingTime.split(':').map(Number);
        let totalEndMinutes = hours * 60 + minutes + totalDuration;
        let endHours = Math.floor(totalEndMinutes / 60) % 24;
        let endMinutes = totalEndMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        // Build where clause
        const whereClause = {
            salonId,
            bookingDate,
            bookingStatus: 'confirmed'
        };
        if (barberId) whereClause.barberId = barberId;

        const slotConflict = await db.Booking.findOne({
            where: {
                ...whereClause,
                [Op.and]: db.sequelize.literal(`
                    "booking_time" < TIME '${endTime}' AND
                    ("booking_time" + ("service_duration" || ' minutes')::interval) > TIME '${bookingTime}'
                `)
            }
        });

        if (slotConflict) {
            await t.rollback();
            return res.status(409).json({
                status: 'FAILED',
                message: 'Selected slot is no longer available'
            });
        }

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
                endTime,
                status: 'PENDING',
                delayMinutes: null
            },
            { transaction: t }
        );

        // ----------------------------
        // 5️⃣ Notifications
        // ----------------------------
        const user = await db.User.findByPk(userId, { attributes: ['fullName'] });
        const userName = user ? user.fullName : 'Customer';
        const serviceNames = servicesPayload.map(s => s.name).join(', ');

        const deviceTokens = await db.DeviceToken.findAll({ where: { salonId, isActive: true } });
        const formattedTime = formatTimeToAMPM(bookingTime);
        const formattedDate = formatDateDMY(bookingDate);

        // 🔔 SEND PUSH NOTIFICATION
        for (const dt of deviceTokens) {

            await sendNotificationToDevice(
                dt.deviceToken,
                "New Booking",
                `${userName} requested a booking at ${formattedTime} on ${formattedDate} for ${serviceNames}`,
                {
                    bookingRequestId: bookingRequest.bookingRequestId,
                    type : 'BOOKING_REQUEST'
                }
            );
        }

        const notification = await db.Notification.create({
            receiverType: 'SALON',
            receiverId: salonId,
            title: 'New Booking',
            message: `You have received a new booking request from ${userName} on ${formattedDate} for ${serviceNames}`,
            data: { bookingRequestId: bookingRequest.bookingRequestId }
        }, { transaction: t });

        req.io.to(`salon_${salonId}`).emit("new_notification", {
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt
        });

        req.io.to(`salon_${salonId}`).emit('notification_count_updated');

        let barberName = null;
        if (barberId) {
            const barber = await db.Barber.findByPk(barberId);
            barberName = barber ? barber.fullName || barber.barberName : null;
        }

        req.io.to(`salon_${salonId}`).emit("new_notification", {
            title: "New Booking",
            message: `You have received a new booking request from ${userName}${barberName ? ` for ${barberName}` : ''}`,
            bookingId: bookingRequest.bookingRequestId
        });

        await t.commit();

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Booking request sent to salon owner',
            data: bookingRequest
        });

    } catch (error) {
        await t.rollback();
        console.error('CREATE BOOKING REQUEST ERROR:', error);
        return res.status(500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = { createBookingRequest };
