// controllers/bookingRequest/customerDelayResponse.js
const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const customerActionBooking = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { action } = req.body; // 'ACCEPT' | 'REJECT'
    const { bookingRequestId } = req.params;
    const customerId = req.user.id;

    // Fetch booking request
    const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId, { transaction: t });
    if (!bookingRequest || bookingRequest.status !== 'DELAY_PROPOSED') {
      await t.rollback();
      return res.status(404).json({ status: 'FAILED', message: 'Booking request not found or not pending delay' });
    }

    // Fetch salon for owner info
    const salon = await db.Salon.findByPk(bookingRequest.salonId, { transaction: t });
    if (!salon) {
      await t.rollback();
      return res.status(404).json({ status: 'FAILED', message: 'Salon not found' });
    }
    const salonId = salon.salonId;
    const salonOwnerName = salon.ownerName || 'Salon Owner';

    // --------------------------
    // 1️⃣ CUSTOMER REJECTS DELAY
    // --------------------------
    if (action === 'REJECT') {
      bookingRequest.status = 'REJECTED';
      await bookingRequest.save({ transaction: t });

      // Send push notifications to salon devices
      const deviceTokens = await db.DeviceToken.findAll({
        where: { salonId, isActive: true }
      });

      for (const dt of deviceTokens) {
        await sendNotificationToDevice(
          dt.deviceToken,
          'Customer Rejected Delay',
          `Customer rejected the proposed delay for booking at ${bookingRequest.startTime}`,
          { bookingRequestId: bookingRequest.bookingRequestId, type: 'DELAY_RESPONSE' }
        );
      }

      // Create notification in DB
      const notification = await db.Notification.create({
        receiverType: 'SALON',
        receiverId: salonId, // ✅ use salonId
        title: 'Customer Rejected Delay',
        message: `Customer rejected the proposed delay for booking at ${bookingRequest.startTime}`
      }, { transaction: t });

      // Emit via socket
      req.io.to(`salon_${salonId}`).emit("new_notification", {
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      });
      req.io.to(`salon_${salonId}`).emit('notification_count_updated');

      await t.commit();
      return res.status(200).json({ status: 'SUCCESS', message: 'Customer rejected the delay' });
    }

    // --------------------------
    // 2️⃣ CUSTOMER ACCEPTS DELAY
    // --------------------------
    if (action === 'ACCEPT') {
      bookingRequest.status = 'ACCEPTED';
      await bookingRequest.save({ transaction: t });

      // Fetch services
      const services = await db.Service.findAll({
        where: { serviceId: { [Op.in]: bookingRequest.serviceIds.map(s => s.serviceId) } },
        transaction: t
      });
      const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

      // Queue number
      const lastQueue = await db.Queue.findOne({
        where: { salonId, bookingDate: bookingRequest.bookingDate },
        order: [['queueNumber', 'DESC']],
        transaction: t
      });
      const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

      // Create Queue
      const queue = await db.Queue.create({
        salonId,
        userId: customerId,
        barberId: bookingRequest.barberId || null,
        bookingDate: bookingRequest.bookingDate,
        bookingTime: bookingRequest.startTime,
        queueNumber,
        estimatedWaitTime: totalDuration
      }, { transaction: t });

      // Create Booking
      const booking = await db.Booking.create({
        queueId: queue.queueId,
        salonId,
        userId: customerId,
        barberId: bookingRequest.barberId || null,
        bookingDate: bookingRequest.bookingDate,
        bookingTime: bookingRequest.startTime,
        bookingStatus: 'confirmed',
        services: bookingRequest.serviceIds,
        serviceDuration: totalDuration
      }, { transaction: t });

      // Notify salon owner
      const deviceTokens = await db.DeviceToken.findAll({
        where: { salonId, isActive: true }
      });

      const customer = await db.User.findByPk(customerId, { attributes: ['fullName'] });
      const customerName = customer ? customer.fullName : 'Customer';
      const formattedTime = bookingRequest.startTime;

      for (const dt of deviceTokens) {
        await sendNotificationToDevice(
          dt.deviceToken,
          "Booking Update",
          `Customer ${customerName} has accepted the delay for booking at ${formattedTime}`,
          { bookingRequestId: bookingRequest.bookingRequestId, type: 'DELAY_RESPONSE'}
        );
      }

      // Create notification in DB
      const notification = await db.Notification.create({
        receiverType: 'SALON',
        receiverId: salonId, // ✅ salonId used here
        title: 'Booking Update',
        message: `Customer ${customerName} has accepted the delay for booking at ${formattedTime}`
      }, { transaction: t });

      // Emit via socket
      req.io.to(`salon_${salonId}`).emit("new_notification", {
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      });
      req.io.to(`salon_${salonId}`).emit('notification_count_updated');

      await t.commit();
      return res.status(200).json({
        status: 'SUCCESS',
        message: 'Customer accepted the delay and booking confirmed',
        data: booking
      });
    }

    await t.rollback();
    return res.status(400).json({ status: 'FAILED', message: 'Invalid action' });

  } catch (error) {
    await t.rollback();
    console.error('CUSTOMER ACTION ERROR:', error);
    return res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

module.exports = { customerActionBooking };
