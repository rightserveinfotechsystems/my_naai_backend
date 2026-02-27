const sendNotificationToDevice = require('../../firebase/sendNotification');
const db = require('../../database/models');

const sendBookingReminder = async (req, res) => {
    const { bookingId } = req.body;

    const booking = await db.Booking.findByPk(bookingId, {
        include: ['user', 'salon']
    });

    if (!booking || booking.reminderSent) {
        return res.status(200).json({ message: 'Already handled' });
    }

    // USER
    if (booking.user?.deviceToken) {
        await sendNotificationToDevice(
            booking.user.deviceToken,
            '⏰ Booking Reminder',
            'Your booking is coming up in 1 minute, get ready!'
        );
    }

    // SALON OWNER
    if (booking.salon?.deviceToken) {
        await sendNotificationToDevice(
            booking.salon.deviceToken,
            '⏰ Upcoming Booking',
            'Booking is coming up in 1 minute, get ready!'
        );
    }

    booking.reminderSent = true;
    await booking.save();

    return res.status(200).json({ success: true });
};

module.exports = { sendBookingReminder };
