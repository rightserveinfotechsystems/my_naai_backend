// bookingRequest/autoCancel.controller.js
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

        // Agar owner already respond kar chuka hai → ignore
        if (bookingRequest.status !== 'PENDING') {
            return res.status(200).json({ status: 'SUCCESS', message: 'Already handled' });
        }

        // Auto cancel booking request
        bookingRequest.status = 'AUTO_CANCELLED';
        await bookingRequest.save();

        // Notify customer
        if (bookingRequest.user?.deviceToken) {
            await sendNotificationToDevice(
                bookingRequest.user.deviceToken,
                '❌ Booking Cancelled',
                'Salon owner did not respond in time, your booking request is auto-cancelled.'
            );
        }

        // Notify salon owner (optional)
        if (bookingRequest.salon?.deviceToken) {
            await sendNotificationToDevice(
                bookingRequest.salon.deviceToken,
                '⚠️ Booking Auto Cancelled',
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