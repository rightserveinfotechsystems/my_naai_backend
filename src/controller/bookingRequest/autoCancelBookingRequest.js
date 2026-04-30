const db = require('../../database/models');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const autoCancelBooking = async (req, res) => {
    try {
        const { bookingRequestId } = req.body;

        const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId, {
            include: ['customer', 'salon']
        });

        if (!bookingRequest) {
            return res.status(404).json({ status: 'FAILED', message: 'Booking request not found' });
        }

        // If delay proposed, skip auto-cancel
        // if (bookingRequest.status === 'DELAY_PROPOSED') {
        //     // console.log("⏳ Delay proposed by salon, auto-cancel skip");
        //     return res.status(200).json({
        //         status: 'SUCCESS',
        //         message: 'Delay proposed, not auto-cancelled'
        //     });
        // }
        // if owner already responded, do not auto-cancel
        // if (bookingRequest.status !== 'PENDING') {
        //     return res.status(200).json({ status: 'SUCCESS', message: 'Already handled' });
        // }

        // ✅ Allow auto-cancel for BOTH cases
        const cancellableStatuses = ['PENDING', 'DELAY_PROPOSED'];

        if (!cancellableStatuses.includes(bookingRequest.status)) {
            // console.log("⛔ Skipping auto-cancel, status:", bookingRequest.status);
            return res.status(200).json({
                status: 'SUCCESS',
                message: `Skipped for status ${bookingRequest.status}`
            });
        }

        // Auto cancel booking request
        bookingRequest.status = 'AUTO_CANCELLED';
        await bookingRequest.save();
        console.log("bookingRequest.user by saurabh", bookingRequest.user)
        // Notify customer
        if (bookingRequest.user?.deviceToken) {
            await sendNotificationToDevice(
                bookingRequest.user.deviceToken,
                '❌ Booking Cancelled!',
                'Salon owner did not respond in time, your booking request is auto-cancelled.'
            );
        }
        // ✅ Get all salon device tokens
        const deviceTokens = await db.DeviceToken.findAll({
            where: {
                salonId: bookingRequest.salonId,
                isActive: true
            }
        });

        // ✅ Send notification to all devices
        // 👉 Extract unique tokens
        const uniqueTokens = [...new Set(deviceTokens.map(dt => dt.deviceToken))];

        // ✅ Send notification
        for (const token of uniqueTokens) {
            await sendNotificationToDevice(
                token,
                '⚠️ Booking Auto Cancelled!',
                'Customer booking request auto-cancelled because no response was given.'
            );
        }

        return res.status(200).json({ status: 'SUCCESS', message: 'Booking auto-cancelled' });
    } catch (error) {
        console.error('Auto-cancel error:', error);
        return res.status(500).json({ status: 'FAILED', message: error.message });
    }
};

module.exports = { autoCancelBooking };