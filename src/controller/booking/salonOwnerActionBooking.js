// controllers/booking/ownerActionBooking.js
const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const salonOwnerActionBooking = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { bookingId } = req.params;
    const { action, delayMinutes = null } = req.body;
    const salonId = req.salon?.salonId; // assuming owner is logged in and attached to req.user

    // ✅ Fetch booking
    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        { model: db.User, as: 'user' },
        { model: db.Salon, as: 'salon' }
      ]
    });

    if (!booking) {
      return res.status(404).json({ status: 'FAILED', message: 'Booking not found' });
    }

    // ✅ Guard: Only requested bookings can be actioned
    if (!['requested', 'delay_requested'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        status: 'FAILED',
        message: 'Booking cannot be actioned'
      });
    }

    // ✅ Perform action
    let updateData = {};
    let notificationTitle = '';
    let notificationMessage = '';
    const userDeviceToken = booking.user.deviceToken;

    if (action === 'ACCEPT') {
      updateData.bookingStatus = 'confirmed';


      updateData.expiresAt = null; // no more expiry
      notificationTitle = 'Booking Confirmed';
      notificationMessage = `Your booking at ${booking.salon.salonName} is confirmed.`;
    }
    // Save booking first
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
      updateData.cancelledBy = 'OWNER';
      notificationTitle = 'Booking Cancelled';
      notificationMessage = `Your booking at ${booking.salon.salonName} was rejected by the salon.`;
    }
    else if (action === 'DELAY') {
      if (!delayMinutes) {
        return res.status(400).json({ status: 'FAILED', message: 'Delay minutes required' });
      }
      updateData.bookingStatus = 'delay_requested';
      // calculate proposed time
      const oldTime = booking.bookingTime || booking.originalBookingTime;
      const [hours, minutes] = oldTime.split(':').map(Number);
      const newDate = new Date();
      newDate.setHours(hours, minutes + delayMinutes, 0, 0);
      const proposedTime = `${String(newDate.getHours()).padStart(2, '0')}:${String(newDate.getMinutes()).padStart(2, '0')}`;
      updateData.proposedBookingTime = proposedTime;
      updateData.delayMinutes = delayMinutes;

      notificationTitle = 'Booking Time Update';
      notificationMessage = `Can you come at ${proposedTime} instead of ${oldTime}?`;
    }
    else {
      return res.status(400).json({ status: 'FAILED', message: 'Invalid action' });
    }

    // ✅ Save changes
    await booking.update(updateData, { transaction: t });
    await t.commit();

    // 🔔 Send notification to customer
    if (userDeviceToken) {
      await sendNotificationToDevice(userDeviceToken, notificationTitle, notificationMessage, {
        type: 'BOOKING_OWNER_ACTION',
        bookingId: booking.bookingId,
        action: action
      });
    }

    // ✅ Optional: In-app notification
    await db.Notification.create({
      receiverType: 'USER',
      receiverId: booking.userId,
      title: notificationTitle,
      message: notificationMessage
    });

    return res.status(200).json({
      status: 'SUCCESS',
      message: `Booking ${action.toLowerCase()} successfully`,
      data: {
        bookingId: booking.bookingId,
        bookingStatus: booking.bookingStatus,
        proposedBookingTime: booking.proposedBookingTime || null
      }
    });

  } catch (err) {
    await t.rollback();
    console.error('Owner Action Error:', err);
    return res.status(500).json({ status: 'FAILED', message: err.message });
  }
};

module.exports = salonOwnerActionBooking;