const db = require('../../database/models');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const userCancelBooking = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { bookingRequestId } = req.params;
        const userId = req.user.id;


        if (!bookingRequestId || bookingRequestId === "null") {
            return res.status(400).json({
                status: "FAIL",
                message: "Invalid booking request id",
            });
        }
        // 1️⃣ BookingRequest fetch
        const bookingRequest = await db.BookingRequest.findOne({
            where: {
                bookingRequestId,
                customerId: userId
            },
            transaction: t
        });

        if (!bookingRequest) {
            await t.rollback();
            return res.status(404).json({
                status: 'FAILED',
                message: 'Booking request not found'
            });
        }

        if (bookingRequest.status === 'CANCELLED') {
            await t.rollback();
            return res.status(400).json({
                status: 'FAILED',
                message: 'Booking already cancelled'
            });
        }

        // 2️⃣ BookingRequest CANCEL
        bookingRequest.status = 'CANCELLED';
        await bookingRequest.save({ transaction: t });

        // 3️⃣ Booking check 
        const booking = await db.Booking.findOne({
            where: { bookingRequestId },
            transaction: t
        });

        let queue = null;

        if (booking) {
            // Booking cancel
            booking.bookingStatus = 'cancelled';
            await booking.save({ transaction: t });

            // Queue cancel 
            queue = await db.Queue.findByPk(booking.queueId, { transaction: t });
            if (queue) {
                queue.status = 'cancelled';
                queue.cancelledAt = new Date();
                queue.cancellationReason = 'Cancelled by customer';
                await queue.save({ transaction: t });
            }
        }

        //  Salon notify
        // const salon = await db.Salon.findByPk(bookingRequest.salonId);
        // if (salon?.deviceToken) {
        //   await sendNotificationToDevice(
        //     salon.deviceToken,
        //     'Booking Cancelled',
        //     'Customer cancelled the booking',
        //     {
        //       bookingRequestId,
        //       type: 'BOOKING_CANCELLED'
        //     }
        //   );
        // }



        let bookingTimeToShow;
        let bookingStatusToShow;

        if (booking) {
            // Confirmed booking exists
            bookingTimeToShow = booking?.bookingTime;
            bookingStatusToShow = booking?.bookingStatus;
        } else {
            // Booking request only
            bookingTimeToShow = bookingRequest?.startTime;
            bookingStatusToShow = bookingRequest?.status;
        }

        const bookingDate = bookingRequest?.bookingDate;

        const notificationMessage = `Customer cancelled the booking on ${bookingDate} at ${bookingTimeToShow}.`;
        // 4️⃣ Salon notify Customer has cancelled their ${readableStatus} booking on ${dateStr} at ${timeStr}.
        const salonId = booking ? booking.salonId : bookingRequest.salonId;

        const deviceTokens = await db.DeviceToken.findAll({
            where: { salonId, isActive: true }
        });

        for (const dt of deviceTokens) {
            await sendNotificationToDevice(
                dt.deviceToken,
                'Booking Cancelled',
                notificationMessage,
                {
                    bookingRequestId,
                    type: 'BOOKING_CANCELLED',
                    bookingDate,
                    bookingTime: bookingTimeToShow,
                    bookingStatus: bookingStatusToShow
                }
            );
        }

        // 5️⃣ Notification entry
        await db.Notification.create({
            receiverType: 'SALON',
            receiverId: bookingRequest.salonId,
            title: 'Booking Cancelled',
            message: 'Customer cancelled the booking'
        }, { transaction: t });

        await t.commit();

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        await t.rollback();
        console.error('USER CANCEL BOOKING ERROR:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = userCancelBooking;