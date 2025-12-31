// services/booking.service.js
const db = require('../database/models');
const { Booking, Queue, Service } = db;
const { Op } = require('sequelize');

class BookingService {
  // 1. Check duplicate booking (user + salon + date)
  static async checkDuplicate(salonId, userId, bookingDate) {
    return await db.Booking.findOne({
      where: { 
        salonId, 
        userId, 
        bookingDate 
      }
    });
  }

  //   
  static async verifyService(salonId, serviceId) {
    return await Service.findOne({
      where: { salonId, serviceId }
    });
  }

  // 3. Get next queue number
static async getNextQueueNumber(salonId, bookingDate) {
  const dateString = new Date(bookingDate).toISOString().split('T')[0];
  const count = await Queue.count({
    where: { salonId, bookingDate: dateString }
  });
  return count + 1;
}

  // 4. Create Queue + Booking 
  static async createBooking(salonId, userId, serviceId, bookingDate, queueNumber, bookingTime) {
    const t = await db.sequelize.transaction();
    try {
      // Queue 
      const queue = await Queue.create({
        salonId,
        userId,
        serviceId,
        queueNumber,
        tokenNumber: queueNumber,
        bookingDate
      }, { transaction: t });

      // Booking 
      const booking = await Booking.create({
        queueId: queue.queueId,
        salonId,
        userId,
        serviceId,
        bookingDate,
        bookingStatus: 'pending',
        bookingTime
      }, { transaction: t });

      await t.commit();
      return { queue, booking };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ✅ ADMIN METHOD - All users ke bookings
// services/booking.service.js - BookingService class mein YEHI method daalo

static async adminListBookings({
  page = 1, searchString = '', statusFilter = '', createdDate = '', limit
} = {}) {
  try {
    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = {};

    // Status filter
    if (statusFilter?.trim()) {
      where.bookingStatus = statusFilter.trim();
    }

    // Created date filter
    if (createdDate) {
      const startOfDay = new Date(createdDate + 'T00:00:00.000Z');
      const endOfDay = new Date(createdDate + 'T23:59:59.999Z');
      where.createdAt = { [Op.between]: [startOfDay, endOfDay] };
    }

    // Search filter - EXACT aliases use kiye
    if (searchString?.trim()) {
      where[Op.or] = [
        { '$salon.salonName$': { [Op.iLike]: `%${searchString.trim()}%` } },
        { '$service.serviceName$': { [Op.iLike]: `%${searchString.trim()}%` } },
        { '$user.fullName$': { [Op.iLike]: `%${searchString.trim()}%` } }
      ];
    }

    // Count
    const totalBookings = await Booking.count({
      where,
      include: [
        { 
          model: db.Queue, 
          as: 'queue', 
          attributes: [],
          required: false 
        },
        { 
          model: db.Salon, 
          as: 'salon', 
          attributes: [],
          required: true 
        },
        { 
          model: db.User, 
          as: 'user', 
          attributes: [],
          required: true 
        },
        { 
          model: db.Service, 
          as: 'service', 
          attributes: [],
          required: true 
        }
      ]
    });

    // Main query - EXACT model aliases
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId',
        'bookingDate', 
        'bookingTime', 
        'bookingStatus',
        'amount',
        'createdAt'
      ],
      include: [
        { 
          model: db.Queue, 
          as: 'queue',           // ✅ EXACT model alias
          attributes: ['queueNumber'],
          required: false 
        },
        { 
          model: db.Salon, 
          as: 'salon',           // ✅ EXACT model alias
          attributes: ['salonName']
        },
        { 
          model: db.User, 
          as: 'user',            // ✅ EXACT model alias
          attributes: ['fullName', 'phoneNumber']
        },
        { 
          model: db.Service, 
          as: 'service',         // ✅ EXACT model alias
          attributes: ['serviceName', 'price']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset
    });

    // Transform data
    const bookingsData = bookings.map(booking => ({
      bookingId: booking.bookingId,
      userName: booking.user?.fullName || '',
      userPhone: booking.user?.phoneNumber || '',
      salonName: booking.salon?.salonName || '',
      serviceName: booking.service?.serviceName || '',
      price: booking.service?.price || booking.amount || 0,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      status: booking.bookingStatus,
      queueNumber: booking.queue?.queueNumber || null,
      createdAt: booking.createdAt
    }));

    return {
      bookings: bookingsData,
      totalBookings,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };

  } catch (error) {
    throw error;
  }
}

static async salonListBookings(salonId, { page = 1, date = '', statusFilter = '', limit } = {}) {
  try {
    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = {};

    // Specific date filter (today's bookings)
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.bookingDate = { [Op.between]: [startOfDay, endOfDay] };
    }

    // Status filter
    if (statusFilter?.trim()) {
      where.bookingStatus = statusFilter.trim();
    }

    // Count
    const totalBookings = await Booking.count({
      where: { ...where, salonId },
      include: [
        { model: db.Queue, as: 'queue', attributes: [] },
        { model: db.User, as: 'user', attributes: [] },
        { model: db.Service, as: 'service', attributes: [] }
      ]
    });

    // Fetch bookings
    const bookings = await Booking.findAll({
      where: { ...where, salonId },
      attributes: ['bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'amount', 'createdAt'],
      include: [
        { 
          model: db.Queue, 
          as: 'queue', 
          attributes: ['queueNumber']
        },
        { 
          model: db.User, 
          as: 'user', 
          attributes: ['fullName', 'phoneNumber']
        },
        { 
          model: db.Service, 
          as: 'service', 
          attributes: ['serviceName']
        }
      ],
      order: [['queue', 'queueNumber', 'ASC']], // Queue order
      limit: safeLimit,
      offset
    });

    const bookingsData = bookings.map(booking => ({
      bookingId: booking.bookingId,
      queueNumber: booking.queue?.queueNumber || null,
      customerName: booking.user?.fullName || '',
      customerPhone: booking.user?.phoneNumber || '',
      serviceName: booking.service?.serviceName || '',
      amount: booking.amount || 0,
      bookingTime: booking.bookingTime,
      status: booking.bookingStatus,
      createdAt: booking.createdAt
    }));

    return {
      bookings: bookingsData,
      totalBookings,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };

  } catch (error) {
    throw error;
  }
}

static async salonOwnerListBookings(salonId, { page = 1, date = '', statusFilter = '', searchString = '', limit } = {}) {
  try {
    if (!salonId) throw new Error('salonId required');

    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = { salonId };

    // Date filter (today by default)
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.bookingDate = { [Op.between]: [startOfDay, endOfDay] };
    }

    // Status filter
    if (statusFilter?.trim()) {
      where.bookingStatus = statusFilter.trim();
    }

    // Search (customer/service)
    if (searchString?.trim()) {
      where[Op.or] = [
        { '$user.fullName$': { [Op.iLike]: `%${searchString.trim()}%` } },
        { '$user.phoneNumber$': { [Op.iLike]: `%${searchString.trim()}%` } },
        { '$service.serviceName$': { [Op.iLike]: `%${searchString.trim()}%` } }
      ];
    }

    // Count
    const totalBookings = await Booking.count({
      where,
      include: [
        { model: db.Queue, as: 'queue', attributes: [] },
        { model: db.User, as: 'user', attributes: [] },
        { model: db.Service, as: 'service', attributes: [] }
      ]
    });

    // Fetch with ALL details
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 
        'amount', 'serviceDuration', 'createdAt', 'updatedAt'
      ],
      include: [
        { 
          model: db.Queue, 
          as: 'queue', 
          attributes: ['queueNumber', 'tokenNumber']
        },
        { 
          model: db.User, 
          as: 'user', 
          attributes: ['fullName', 'phoneNumber', 'email']
        },
        { 
          model: db.Service, 
          as: 'service', 
          attributes: ['serviceName', 'price', 'duration']
        },
        { 
          model: db.Barber, 
          as: 'barber', 
          attributes: ['fullName', 'phoneNumber']
        }
      ],
      order: [
        ['bookingDate', 'ASC'],
        [{ model: db.Queue, as: 'queue' }, 'queueNumber', 'ASC']
      ],
      limit: safeLimit,
      offset
    });

    const bookingsData = bookings.map(booking => ({
      bookingId: booking.bookingId,
      queueNumber: booking.queue?.queueNumber || null,
      tokenNumber: booking.queue?.tokenNumber || null,
      customerName: booking.user?.fullName || '',
      customerPhone: booking.user?.phoneNumber || '',
      customerEmail: booking.user?.email || '',
      serviceName: booking.service?.serviceName || '',
      servicePrice: booking.service?.price || booking.amount || 0,
      serviceDuration: booking.serviceDuration || booking.service?.duration || 0,
      barberName: booking.barber?.fullName || '',
      amount: booking.amount || 0,
      bookingTime: booking.bookingTime,
      status: booking.bookingStatus,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    return {
      bookings: bookingsData,
      totalBookings,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };

  } catch (error) {
    throw error;
  }
}


}

module.exports = BookingService;
