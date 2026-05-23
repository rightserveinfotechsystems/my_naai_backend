const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');
const { formatTo12Hour } = require('../../utils/timeFormat');
const { scheduleAutoCancelTask, deleteBookingAutoCancelTask } = require('../../tasks/autoCancelTask');
const { createBookingReminderTask } = require('../../tasks/bookingReminderTask');

const ownerActionBooking = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { action, delayMinutes = null } = req.body; // 'ACCEPT' | 'REJECT' | 'DELAY'
        const { bookingRequestId } = req.params;
        const ownerId = req.salon.salonId;

        const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId, { transaction: t });
        if (!bookingRequest) {
            await t.rollback();
            return res.status(404).json({ status: 'FAILED', message: 'Booking request not found.' });
        }

        if (bookingRequest.status === 'CANCELLED' || bookingRequest.status === 'AUTO_CANCELLED') {
            await t.rollback();
            return res.status(200).json({ status: 'FAILED', message: 'Booking request already cancelled' });
        }

        if (['ACCEPTED', 'REJECTED', 'DELAY_PROPOSED'].includes(bookingRequest?.status)) {
            await t.rollback();
            return res.status(200).json({ status: 'FAILED', message: 'Action is already taken on this booking request' });
        }

        const user = await db.User.findByPk(bookingRequest.customerId, { attributes: ['userId', 'fullName', 'deviceToken'] });
        if (!user?.deviceToken) {
            console.log('❌ No device token found for customer');
        }
        const userName = user ? user.fullName : 'Customer';
        const deviceTokens = user && user.deviceToken ? [user.deviceToken] : [];
        const uniqueTokens = [...new Set(deviceTokens.map(dt => dt))];
        //cancel the auto cancel task if owner took action
        if (bookingRequest?.autoCancelTaskName) {
            // await deleteBookingAutoCancelTask(bookingRequest.autoCancelTaskName);
        }

        // --------------------------
        // 1️⃣ REJECT
        // --------------------------
        if (action === 'REJECT') {
            bookingRequest.status = 'REJECTED';
            await bookingRequest.save({ transaction: t });

            // Notify customer

            for (const deviceToken of uniqueTokens) {
                await sendNotificationToDevice(deviceToken, 'Booking Rejected', `Your booking request has been rejected by the salon.`,
                    {
                        bookingRequestId: bookingRequest.bookingRequestId,
                        type: 'BOOKING_REJECTED'
                    },
                );
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

            const originalTime = new Date(`${bookingRequest.bookingDate}T${bookingRequest.startTime}`);
            const proposedTime = new Date(originalTime.getTime() + delayMinutes * 60 * 1000);

            // Format HH:MM
            const hours = proposedTime.getHours().toString().padStart(2, '0');
            const minutes = proposedTime.getMinutes().toString().padStart(2, '0');
            const proposedTimeStr = formatTo12Hour(proposedTime.toTimeString().slice(0, 5));

            bookingRequest.status = 'DELAY_PROPOSED';
            bookingRequest.delayMinutes = delayMinutes;
            await bookingRequest.save({ transaction: t });

            // Notify customer



            for (const deviceToken of uniqueTokens) {
                await sendNotificationToDevice(deviceToken, 'Booking Delay Proposed',
                    `Salon proposed to delay your booking to ${proposedTimeStr}. Accept or Reject?`,
                    {
                        bookingRequestId: bookingRequest.bookingRequestId,
                        type: 'DELAY_TIME_PROPOSAL',
                        delayMinutes: delayMinutes,
                        proposedTime: proposedTimeStr
                    },

                );
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Delay Proposed',
                message: `Salon proposed to delay your booking to ${proposedTimeStr}. Accept or Reject?`
            }, { transaction: t });

            await t.commit();

            // ⏱️ CUSTOMER RESPONSE → 1 MIN AUTO-CANCEL
            try {
                await scheduleAutoCancelTask({
                    bookingRequestId: bookingRequest.bookingRequestId,
                    delayInSeconds: 60, // 1 minute
                });
            } catch (err) {
                console.error('Error scheduling auto-cancel for delayed booking:', err);
            }
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

            const bookingStartTime = new Date(`${bookingRequest.bookingDate}T${bookingRequest.startTime}`);
            const bookingEndTime = new Date(bookingStartTime.getTime() + totalDuration * 60 * 1000);


            const bookingTime12hr = formatTo12Hour(bookingRequest.startTime);
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
                bookingEndTime: bookingEndTime.toTimeString().slice(0, 8),
                bookingStatus: 'confirmed',
                services: bookingRequest.serviceIds,
                serviceDuration: totalDuration,
                bookingRequestId: bookingRequest.bookingRequestId
            }, { transaction: t });


            // Set reminder time for booking
            const bookingDateTime = new Date(
                `${booking.bookingDate}T${booking.bookingTime}+05:30` //  salon is in IST timezone, adjust as needed    
            );

            // Set reminder 20 minute before booking time
            booking.reminderTime = new Date(
                // bookingDateTime.getTime() - 20 * 60 * 1000
                bookingDateTime.getTime() - 10 * 60 * 1000
            );

            booking.reminderSent = false;


            await booking.save();


            // Notify customer

            for (const deviceToken of uniqueTokens) {
                await sendNotificationToDevice(deviceToken, 'Booking Confirmed', `Your booking at salon is confirmed for ${bookingTime12hr}`,
                    {
                        bookingRequestId: bookingRequest.bookingRequestId,
                        type: 'BOOKING_CONFIRMED'
                    },

                );
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Confirmed',
                message: `Your booking at salon is confirmed for ${bookingTime12hr}`
            }, { transaction: t });

            await t.commit();
            try {
                await createBookingReminderTask(booking);
            } catch (reminderError) {
                console.error('Error creating booking reminder task:', reminderError);
            }
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Booking request accepted and confirmed',
                data: booking
            });
        }



        await t.rollback();
        return res.status(400).json({ status: 'FAILED', message: 'Invalid action. Allowed values: ACCEPT, REJECT, DELAY' });

    } catch (error) {
        await t.rollback();
        console.error('OWNER ACTION ERROR:', error);
        return res.status(500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = { ownerActionBooking };
