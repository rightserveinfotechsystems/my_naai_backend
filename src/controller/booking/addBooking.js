// controllers/booking/createBooking.js
const db = require('../../database/models');
const { Op } = require('sequelize');
const { Notification } = db;
const sendNotificationToDevice = require('../../firebase/sendNotification');
const { createBookingSchema } = require('../../validations/booking.validation');

const createBooking = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    // ✅ Validate request
    const { error, value } = createBookingSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ status: 'FAILED', message: error.details[0].message });
    }

    const { salonId, userId, barberId = null, bookingDate, bookingTime = null, serviceIds } = value;

    // ✅ Date validation: only today + 2 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allowedDates = [0, 1, 2].map(d => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      // Get YYYY-MM-DD in local time
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });


    if (!allowedDates.includes(bookingDate)) {
      await t.rollback();
      return res.status(400).json({ status: 'FAILED', message: 'Booking allowed only for 3 days' });
    }
    // ✅ Check: user can book only once per day
    const existingBooking = await db.Booking.findOne({
      where: {
        userId,
        bookingDate
      }
    });

    if (existingBooking) {
      await t.rollback();
      return res.status(409).json({
        status: 'FAILED',
        message: 'You already have a booking for this date'
      });
    }
    // ✅ Check if time slot already booked
    if (bookingTime) {
      const slotBooked = await db.Booking.findOne({
        where: {
          salonId,
          bookingDate,
          bookingTime,
          bookingStatus: {
            [Op.in]: ['pending']
          }
        }
      });


      if (slotBooked) {
        await t.rollback();
        return res.status(409).json({
          status: 'FAILED',
          message: 'This time slot is already booked'
        });
      }
    }


    // ✅ Fetch services and calculate total
    const services = await db.Service.findAll({
      where: {
        serviceId: {
          [Op.in]: serviceIds
        }
      }
    });
    if (services.length !== serviceIds.length) {
      return res.status(400).json({ status: 'FAILED', message: 'Invalid service selected' });
    }

    const servicesPayload = services.map(s => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      durationMinutes: s.durationMinutes,
      price: s.price
    }));

    const totalDuration = servicesPayload.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalAmount = servicesPayload.reduce((sum, s) => sum + Number(s.price), 0);

    // ✅ Queue number auto
    const lastQueue = await db.Queue.findOne({
      where: { salonId, bookingDate },
      order: [['queueNumber', 'DESC']]
    });
    const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

    // ✅ Create queue
    const queue = await db.Queue.create({
      salonId,
      userId,
      barberId,
      bookingDate,
      bookingTime,
      queueNumber,
      estimatedWaitTime: totalDuration,
      serviceId: serviceIds.length === 1 ? serviceIds[0] : null
    }, { transaction: t });

    // ✅ Create booking with multiple services
    const booking = await db.Booking.create({
      queueId: queue.queueId,
      salonId,
      userId,
      barberId,
      bookingDate,
      bookingTime,
      bookingStatus: 'pending',
      services: servicesPayload,
      serviceDuration: totalDuration,
      amount: totalAmount
    }, { transaction: t });

    await t.commit();


    // 🔥 GET SALON DEVICE TOKENS
    const deviceTokens = await db.DeviceToken.findAll({
      where: {
        salonId,
        isActive: true
      }
    });



    // 🔔 SEND PUSH NOTIFICATION
    for (const dt of deviceTokens) {

      await sendNotificationToDevice(
        dt.deviceToken,
        "New Booking",
        "You have received a new booking request"
      );
    }

    // 🔔 IN-APP NOTIFICATION 
    await Notification.create({
      receiverType: 'SALON',
      receiverId: salonId,
      title: 'New Booking',
      message: 'You have received a new booking request'
    });

    //  REAL-TIME SOCKET EVENT
    req.io
      .to(`salon_${salonId}`)
      .emit("new_notification", {
        title: Notification.title,
        message: Notification.message,
        createdAt: Notification.createdAt
      });

    //  OPTIONAL: notification count update
    req.io
      .to(`salon_${salonId}`)
      .emit('notification_count_updated');


    let barberName = null;
    if (barberId) {
      const barber = await db.Barber.findByPk(barberId);
      barberName = barber ? barber.fullName || barber.barberName : null;
    }
    req.io.to(`salon_${salonId}`).emit("new_notification", {
      title: "New Booking",
      message: "You have received a new booking request",
      bookingId: booking.bookingId
    });

    return res.status(200).json({
      status: 'SUCCESS',
      message: 'Booking created successfully',
      data: {
        bookingId: booking.bookingId,
        queueNumber,
        totalDuration,
        totalAmount,
        services: servicesPayload
      }
    });

  } catch (err) {
    await t.rollback();
    console.error(err);
    console.error('Booking error:', err);
    return res.status(500).json({ status: 'FAILED', message: 'Server error' });
  }
};



module.exports = { createBooking };
