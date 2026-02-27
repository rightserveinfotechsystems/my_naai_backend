const db = require('../../database/models');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const customerDelayAction = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { bookingId } = req.params;
        const { action } = req.body;
        const customerId = req.user?.id;

        const booking = await db.Booking.findByPk(bookingId, {
            include: [{ model: db.Salon, as: 'salon' }]
        });

        if (!booking) return res.status(404).json({ status: 'FAILED', message: 'Booking not found' });
        if (booking.userId !== customerId) return res.status(403).json({ status: 'FAILED', message: 'Unauthorized' });
        if (booking.bookingStatus !== 'delay_requested') return res.status(400).json({ status: 'FAILED', message: 'No delay request found' });

        let updateData = {}, notificationTitle = '', notificationMessage = '';
        const salonDeviceTokens = await db.DeviceToken.findAll({ where: { salonId: booking.salonId, isActive: true } });

        if (action === 'ACCEPT') {
            updateData.bookingStatus = 'confirmed';
            updateData.bookingTime = booking.proposedBookingTime;
            notificationTitle = 'Booking Confirmed';
            notificationMessage = `Customer accepted the proposed delay at ${booking.proposedBookingTime}.`;
        }// Save booking first
        await booking.update(updateData, { transaction: t });

        // ✅ Create queue only for confirmed bookings
        if (action === 'ACCEPT') {
            const lastQueue = await db.Queue.findOne({
                where: { salonId: booking.salonId, bookingDate: booking.bookingDate },
                order: [['queueNumber', 'DESC']]
            });
            const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

            await db.Queue.create({
                salonId: booking.salonId,
                userId: booking.userId,
                barberId: booking.barberId,
                bookingDate: booking.bookingDate,
                bookingTime: booking.bookingTime,
                queueNumber,
                bookingId: booking.bookingId,
                estimatedWaitTime: booking.serviceDuration
            });
        }
        else if (action === 'REJECT') {
            updateData.bookingStatus = 'cancelled';
            updateData.cancelledBy = 'CUSTOMER';
            notificationTitle = 'Booking Cancelled';
            notificationMessage = 'Customer rejected the proposed delay.';
        } else return res.status(400).json({ status: 'FAILED', message: 'Invalid action' });

        await booking.update(updateData, { transaction: t });
        await t.commit();

        // Notify salon owner
        for (const dt of salonDeviceTokens) {
            await sendNotificationToDevice(dt.deviceToken, notificationTitle, notificationMessage, {
                type: 'BOOKING_CUSTOMER_DELAY_ACTION', bookingId: booking.bookingId, action: action
            });
        }

        // In-app notification
        await db.Notification.create({
            receiverType: 'SALON',
            receiverId: booking.salonId,
            title: notificationTitle,
            message: notificationMessage
        });

        return res.status(200).json({
            status: 'SUCCESS',
            message: `Booking ${action.toLowerCase()} successfully`,
            data: {
                bookingId: booking.bookingId,
                bookingStatus: booking.bookingStatus,
                bookingTime: booking.bookingTime
            }
        });

    } catch (err) {
        await t.rollback();
        console.error('Customer Delay Action Error:', err);
        return res.status(500).json({ status: 'FAILED', message: err.message });
    }
};

module.exports = customerDelayAction;