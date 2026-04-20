const db = require('../../database/models');
const { formatTo12Hour } = require('../../utils/timeFormat');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const userCancelBooking = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        // ✅ Extract bookingId from params
        const { bookingRequestId } = req.params;
        //assign bookingRequestId to bookingId because we are passing bookingRequestId in the route, but we will use it as bookingId to find the booking and cancel it
        const bookingId = bookingRequestId;

        const userId = req.user.id;

        // console.log("BOOKING ID:", bookingId);

        // ✅ Validate
        if (!bookingId || bookingId === "null") {
            await t.rollback();
            return res.status(400).json({
                status: "FAIL",
                message: "Invalid booking id",
            });
        }

        // ✅ Find booking using bookingId
        const booking = await db.Booking.findOne({
            where: {
                bookingId,
                userId
            },
            transaction: t
        });

        if (!booking) {
            await t.rollback();
            return res.status(404).json({
                status: 'FAILED',
                message: 'Booking not found'
            });
        }

        // ✅ Already cancelled
        if (booking.bookingStatus === 'cancelled') {
            await t.rollback();
            return res.status(400).json({
                status: 'FAILED',
                message: 'Booking already cancelled'
            });
        }

        // ✅ Cancel booking
        booking.bookingStatus = 'cancelled';
        await booking.save({ transaction: t });

        // ✅ Cancel related bookingRequest (if exists)
        if (booking.bookingRequestId) {
            const bookingRequest = await db.BookingRequest.findByPk(
                booking.bookingRequestId,
                { transaction: t }
            );

            if (bookingRequest && bookingRequest.status !== 'CANCELLED') {
                bookingRequest.status = 'CANCELLED';
                await bookingRequest.save({ transaction: t });
            }
        }

        // ✅ Cancel queue
        const queue = await db.Queue.findByPk(booking.queueId, { transaction: t });

        if (queue) {
            queue.status = 'cancelled';
            queue.cancelledAt = new Date();
            queue.cancellationReason = 'Cancelled by customer';
            await queue.save({ transaction: t });
        }

        //convert booking time to 12-hour format
        const formattedBookingTime = formatTo12Hour(booking.bookingTime);

        // ✅ Notification
        const message = `Customer cancelled the booking on ${booking.bookingDate} at ${formattedBookingTime}.`;

        const deviceTokens = await db.DeviceToken.findAll({
            where: {
                salonId: booking.salonId,
                isActive: true
            }
        });

        for (const dt of deviceTokens) {
            await sendNotificationToDevice(
                dt.deviceToken,
                'Booking Cancelled',
                message,
                {
                    bookingId: booking.bookingId,
                    type: 'BOOKING_CANCELLED'
                }
            );
        }

        await db.Notification.create({
            receiverType: 'SALON',
            receiverId: booking.salonId,
            title: 'Booking Cancelled',
            message
        }, { transaction: t });

        await t.commit();

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        await t.rollback();
        console.error('ERROR:', error);

        return res.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = userCancelBooking;