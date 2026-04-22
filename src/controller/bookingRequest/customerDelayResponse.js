const db = require('../../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../../firebase/sendNotification');
const { formatTo12Hour } = require('../../utils/timeFormat');
const { createBookingReminderTask } = require('../../tasks/bookingReminderTask');

const customerActionBooking = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { action } = req.body; // 'ACCEPT' | 'REJECT'
    const { bookingRequestId } = req.params;
    const customerId = req.user.id;

    // Fetch booking request
    const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId, { transaction: t });
    if (!bookingRequest) {
      await t.rollback();
      return res.status(404).json({ status: 'FAILED', message: 'Booking request not found' });
    }
    if (bookingRequest.status !== 'DELAY_PROPOSED') {
      await t.rollback();
      return res.status(400).json({ status: 'FAILED', message: 'No delay proposed for this booking request' });
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

      const formattedTime = formatTo12Hour(bookingRequest.startTime);
      for (const dt of deviceTokens) {
        await sendNotificationToDevice(
          dt.deviceToken,
          'Customer Rejected Delay',
          `Customer rejected the proposed delay for booking at ${formattedTime}`,
          {
            bookingRequestId: bookingRequest.bookingRequestId,
            type: 'DELAY_RESPONSE'
          }
        );
      }

      // Create notification in DB
      const notification = await db.Notification.create({
        receiverType: 'SALON',
        receiverId: salonId, // ✅ use salonId
        title: 'Customer Rejected Delay',
        message: `Customer rejected the proposed delay for booking at ${formattedTime}`
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
      const delayMinutes = bookingRequest.delayMinutes || 0;

      const originalTime = new Date(`${bookingRequest.bookingDate}T${bookingRequest.startTime}`);
      const finalTime = new Date(originalTime.getTime() + delayMinutes * 60 * 1000);

      const finalTimeStr = finalTime.toTimeString().slice(0, 8);
      const finalTime12hr = formatTo12Hour(finalTime.toTimeString().slice(0, 5));

      bookingRequest.startTime = finalTimeStr;
      console.log('Updated bookingRequest startTime to:', finalTimeStr, bookingRequest.startTime = finalTimeStr);
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
        // bookingTime: bookingRequest.startTime, // This will be the original time
        bookingTime: finalTimeStr,
        queueNumber,
        estimatedWaitTime: totalDuration
      }, { transaction: t });


      // Calculate booking end time
      // const bookingStartTime = new Date(`${bookingRequest.bookingDate}T${bookingRequest.startTime}`);
      const bookingStartTime = new Date(`${bookingRequest.bookingDate}T${finalTimeStr}`);
      const bookingEndTime = new Date(bookingStartTime.getTime() + totalDuration * 60 * 1000);

      // Create Booking
      const booking = await db.Booking.create({
        queueId: queue.queueId,
        salonId,
        userId: customerId,
        barberId: bookingRequest.barberId || null,
        bookingDate: bookingRequest.bookingDate,
        // bookingTime: bookingRequest.startTime,
        bookingTime: finalTimeStr,
        bookingEndTime: bookingEndTime.toTimeString().slice(0, 8),
        bookingStatus: 'confirmed',
        services: bookingRequest.serviceIds,
        serviceDuration: totalDuration,
        bookingRequestId: bookingRequest.bookingRequestId
      }, { transaction: t });

      // Notify salon owner
      const deviceTokens = await db.DeviceToken.findAll({
        where: { salonId, isActive: true }
      });

      const startTime12hr = formatTo12Hour(bookingRequest.startTime);
      const endTime12hr = formatTo12Hour(bookingEndTime.toTimeString().slice(0, 5));


      const customer = await db.User.findByPk(customerId, { attributes: ['fullName'] });
      const customerName = customer ? customer.fullName : 'Customer';
      const formattedTime = bookingRequest.startTime;

      for (const dt of deviceTokens) {
        await sendNotificationToDevice(
          dt.deviceToken,
          "Booking Update",
          `Customer ${customerName} has accepted the delay for booking from ${startTime12hr} to ${endTime12hr}`,
          {
            bookingRequestId: bookingRequest.bookingRequestId,
            type: 'DELAY_RESPONSE'
          }
        );
      }

      // Create notification in DB
      const notification = await db.Notification.create({
        receiverType: 'SALON',
        receiverId: salonId, // ✅ salonId used here
        title: 'Booking Update',
        message: `Customer ${customerName} has accepted the delay for booking from ${startTime12hr} to ${endTime12hr}`
      }, { transaction: t });

      // Emit via socket
      req.io.to(`salon_${salonId}`).emit("new_notification", {
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      });
      req.io.to(`salon_${salonId}`).emit('notification_count_updated');

      // 🆕 ADD THIS REMINDER LOGIC HERE (Exactly like Owner Action)
      const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}`);

      // Set reminder 1 minute before (Testing ke liye)
      booking.reminderTime = new Date(
        bookingDateTime.getTime() - 20 * 60 * 1000
      );
      booking.reminderSent = false;

      // Save booking with reminder info
      await booking.save({ transaction: t });

      await t.commit();
      // send task in queue
      try {
        await createBookingReminderTask(booking);
      } catch (reminderError) {
        console.error('Error creating booking reminder task:', reminderError);
      }
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
