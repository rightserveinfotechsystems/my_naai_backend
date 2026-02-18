// controllers/booking/ownerActionBooking.js
const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const ownerActionBooking = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { action, delayMinutes = null } = req.body; // 'ACCEPT' | 'REJECT' | 'DELAY'
        const { bookingRequestId } = req.params;
        const ownerId = req.salon.salonId;

        const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId, { transaction: t });
        if (!bookingRequest || bookingRequest.status === 'CANCELLED') {
            await t.rollback();
            return res.status(404).json({ status: 'FAILED', message: 'Booking request not found or cancelled' });
        }

        const user = await db.User.findByPk(bookingRequest.customerId);
        const userName = user ? user.fullName : 'Customer';
        const deviceTokens = user && user.deviceToken ? [user.deviceToken] : [];

        // --------------------------
        // 1️⃣ REJECT
        // --------------------------
        if (action === 'REJECT') {
            bookingRequest.status = 'REJECTED';
            await bookingRequest.save({ transaction: t });

            // Notify customer
            for (const dt of deviceTokens) {
                await sendNotificationToDevice(dt, 'Booking Rejected', `Your booking request has been rejected by the salon.`);
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Rejected',
                message: 'Your booking request has been rejected by the salon.'
            }, { transaction: t });

            await t.commit();
            return res.status(200).json({ status: 'SUCCESS', message: 'Booking request rejected' });
        }

        // --------------------------
        // 2️⃣ DELAY
        // --------------------------
        if (action === 'DELAY') {
            if (!delayMinutes) {
                await t.rollback();
                return res.status(400).json({ status: 'FAILED', message: 'Delay minutes required' });
            }
            bookingRequest.status = 'DELAY_PROPOSED';
            bookingRequest.delayMinutes = delayMinutes;
            await bookingRequest.save({ transaction: t });

            // Notify customer
            for (const dt of deviceTokens) {
                await sendNotificationToDevice(dt, 'Booking Delay Proposed', 
                    `Salon proposed to delay your booking by ${delayMinutes} minutes. Accept or Reject?`
                );
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Delay Proposed',
                message: `Salon proposed to delay your booking by ${delayMinutes} minutes. Accept or Reject?`
            }, { transaction: t });

            await t.commit();
            return res.status(200).json({ status: 'SUCCESS', message: 'Delay proposed to customer' });
        }

        // --------------------------
        // 3️⃣ ACCEPT
        // --------------------------
        if (action === 'ACCEPT') {
            bookingRequest.status = 'ACCEPTED';
            await bookingRequest.save({ transaction: t });

            // ✅ Create Queue
            const services = await db.Service.findAll({ where: { serviceId: { [Op.in]: bookingRequest.serviceIds.map(s => s.serviceId) } } });
            const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

            // Queue number
            const lastQueue = await db.Queue.findOne({
                where: { salonId: bookingRequest.salonId, bookingDate: bookingRequest.bookingDate },
                order: [['queueNumber', 'DESC']],
                transaction: t
            });
            const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

            const queue = await db.Queue.create({
                salonId: bookingRequest.salonId,
                userId: bookingRequest.customerId,
                barberId: bookingRequest.barberId,
                bookingDate: bookingRequest.bookingDate,
                bookingTime: bookingRequest.startTime,
                queueNumber,
                estimatedWaitTime: totalDuration,
            }, { transaction: t });

            // ✅ Create Booking
            const booking = await db.Booking.create({
                queueId: queue.queueId,
                salonId: bookingRequest.salonId,
                userId: bookingRequest.customerId,
                barberId: bookingRequest.barberId,
                bookingDate: bookingRequest.bookingDate,
                bookingTime: bookingRequest.startTime,
                bookingStatus: 'confirmed',
                services: bookingRequest.serviceIds,
                serviceDuration: totalDuration
            }, { transaction: t });

            // Notify customer
            for (const dt of deviceTokens) {
                await sendNotificationToDevice(dt, 'Booking Confirmed', `Your booking at salon is confirmed for ${bookingRequest.startTime}`);
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Confirmed',
                message: `Your booking at salon is confirmed for ${bookingRequest.startTime}`
            }, { transaction: t });

            await t.commit();
            return res.status(200).json({ status: 'SUCCESS', message: 'Booking request accepted and confirmed', data: booking });
        }

        await t.rollback();
        return res.status(400).json({ status: 'FAILED', message: 'Invalid action' });

    } catch (error) {
        await t.rollback();
        console.error('OWNER ACTION ERROR:', error);
        return res.status(500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = { ownerActionBooking };
