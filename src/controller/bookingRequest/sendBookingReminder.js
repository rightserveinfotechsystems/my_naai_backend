// const sendNotificationToDevice = require('../../firebase/sendNotification');
// const db = require('../../database/models');

// const sendBookingReminder = async (req, res) => {
//     try {
//         const { bookingId } = req.body;

//         const booking = await db.Booking.findByPk(bookingId, {
//             include: ['user', 'salon']
//         });

//         if (!booking || booking.reminderSent) {
//             return res.status(200).json({ message: 'Already handled' });
//         }

//         // USER
//         if (booking.user?.deviceToken) {
//             await sendNotificationToDevice(
//                 booking.user.deviceToken,
//                 '⏰ Booking Reminder',
//                 'Your booking is coming up in 1 minute, get ready!'
//             );
//         }

//         // SALON OWNER
//         if (booking.salon?.deviceToken) {
//             await sendNotificationToDevice(
//                 booking.salon.deviceToken,
//                 '⏰ Upcoming Booking',
//                 'Booking is coming up in 1 minute, get ready!'
//             );
//         }

//         booking.reminderSent = true;
//         await booking.save();

//         return res.status(200).json({ success: true });
//     } catch (error) {
//         console.error('Error sending booking reminder:', error);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };
//     module.exports = { sendBookingReminder };
const sendNotificationToDevice = require('../../firebase/sendNotification');
const db = require('../../database/models');
const { formatTo12Hour } = require('../../utils/timeFormat');

const sendBookingReminder = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await db.Booking.findByPk(bookingId, {
            include: [{ model: db.User, as: 'user' }]
        });

        // Skip if: booking deleted, already sent, or cancelled
        // if (!booking || booking.reminderSent || booking.bookingStatus !== 'confirmed') {
        //     return res.status(200).json({ message: 'Reminder not required' });
        // }
        if (!booking || booking.reminderSent) {
            return res.status(200).json({ message: 'Reminder not required' });
        }

        // ⛔ If booking is cancelled or completed, skip reminder
        if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
            return res.status(200).json({ message: 'Booking cancelled/completed, no reminder' });
        }

        // ✅ Only send reminder for confirmed bookings
        if (booking.bookingStatus !== 'confirmed') {
            return res.status(200).json({ message: 'Reminder skipped (not confirmed)' });
        }

        const formattedTime = formatTo12Hour(booking.bookingTime);
        // Send to Customer
        if (booking.user?.deviceToken) {
            await sendNotificationToDevice(
                booking.user.deviceToken,
                "Appointment Reminder",
                `Your salon session starts at ${formattedTime}. See you soon!`
            );
        }

        // Send to Salon Owner (Fetch tokens)
        const salonTokens = await db.DeviceToken.findAll({
            where: { salonId: booking.salonId, isActive: true }
        });
        for (const dt of salonTokens) {
            await sendNotificationToDevice(dt.deviceToken, "Upcoming Client", `Reminder: Booking at ${formattedTime}`);
        }

        // Update DB so we don't send it again
        await booking.update({ reminderSent: true });

        return res.status(200).send('Reminders Sent Successfully');
    } catch (error) {
        console.error('Worker Error:', error);
        return res.status(500).send(error.message); // Retry if fails
    }
};
module.exports = { sendBookingReminder };
