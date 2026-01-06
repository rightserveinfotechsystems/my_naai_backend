// controllers/booking/createBooking.js
const db = require('../../database/models');
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
      return dt.toISOString().split('T')[0];
    });

    if (!allowedDates.includes(bookingDate)) {
      return res.status(400).json({ status: 'FAILED', message: 'Booking allowed only for 3 days' });
    }

    // ✅ Fetch services and calculate total
    const services = await db.Service.findAll({ where: { serviceId: serviceIds } });
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
      status: 'waiting'
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
     let barberName = null;
    if (barberId) {
      const barber = await db.Barber.findByPk(barberId);
      barberName = barber ? barber.fullName || barber.barberName : null;
    }

    return res.status(201).json({
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
