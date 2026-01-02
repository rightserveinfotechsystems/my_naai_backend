const db = require('../database/models');
const { Booking, Queue, Service, Salon, User, Barber } = db;
const { Op, Sequelize } = require('sequelize');

/**
 * Check duplicate booking (user + salon + date)
 */
const checkDuplicate = async (salonId, userId, bookingDate) => {
  try {
    return await Booking.findOne({
      where: {
        salonId,
        userId,
        bookingDate
      }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Verify service belongs to salon
 */
const verifyService = async (salonId, serviceId) => {
  try {
    return await Service.findOne({
      where: { salonId, serviceId }
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get next queue number for salon on specific date
 */
const getNextQueueNumber = async (salonId, bookingDate) => {
  try {
    const dateString = new Date(bookingDate).toISOString().split('T')[0];
    const count = await Queue.count({
      where: { salonId, bookingDate: dateString }
    });
    return count + 1;
  } catch (error) {
    throw error;
  }
};

/**
 * Create Queue + Booking (transactional)
 */
const createBooking = async (salonId, userId, serviceId, bookingDate, queueNumber, bookingTime) => {
  const t = await db.sequelize.transaction();
  try {
    // Create Queue first
    const queue = await Queue.create({
      salonId,
      userId,
      serviceId,
      queueNumber,
      tokenNumber: queueNumber,
      bookingDate
    }, { transaction: t });

    // Create Booking
    const booking = await Booking.create({
      queueId: queue.queueId, // ✅ Fixed: queue.id instead of queue.queueId
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
};

/**
 * ADMIN: List all bookings with pagination, search, status & date filters
 */
/**
 * ADMIN: List all bookings with pagination & simple search (listSalons pattern)
 */
const adminListBookings = async ({
  page = 1, searchString = '', statusFilter = '', createdDate = '', limit
} = {}) => {
  try {
    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = {};


    // Salon filter ✅ NEW
    if (salonFilter?.trim()) {
      where.salonId = salonFilter.trim();  // assuming salonId is foreign key in Booking
    }

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

    // ✅ SIMPLE SEARCH like listSalons (NO Sequelize.col complexity)
    // ✅ FIXED: Correct column names (snake_case)
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { '$salon.salon_name$': { [Op.iLike]: like } },      // ✅ salon_name
        { '$service.service_name$': { [Op.iLike]: like } },   // ✅ service_name
        { '$user.full_name$': { [Op.iLike]: like } },         // ✅ full_name
        { '$user.phone_number$': { [Op.iLike]: like } }       // ✅ phone_number
      ];
    }
    // ✅ FIXED: Count with SAME includes
    const totalBookings = await Booking.count({
      where,
      include: [
        { model: Queue, as: 'queue', attributes: [], required: false },
        { model: Salon, as: 'salon', attributes: [], required: false },
        { model: User, as: 'user', attributes: [], required: false },
        { model: Service, as: 'service', attributes: [], required: false }
      ]
    });

    // Main query
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'amount', 'createdAt',
        [Sequelize.col('salon.salon_name'), 'salonName'],
        [Sequelize.col('service.service_name'), 'serviceName'],
        [Sequelize.col('user.full_name'), 'userName'],
        [Sequelize.col('user.phone_number'), 'userPhone'],
        [Sequelize.col('service.price'), 'servicePrice'],
        [Sequelize.col('queue.queue_number'), 'queueNumber']
      ],
      include: [
        { model: Queue, as: 'queue', attributes: [] },
        { model: Salon, as: 'salon', attributes: [] },
        { model: User, as: 'user', attributes: [] },
        { model: Service, as: 'service', attributes: [] }
      ],
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset
    });

    return {
      bookings,
      totalBookings,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };
  } catch (error) {
    throw error;
  }
};


/**
 * SALON STAFF: List bookings for specific salon (queue order)
 */
const salonListBookings = async (salonId, { page = 1, date = '', statusFilter = '', limit } = {}) => {
  try {
    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = {};

    // Specific date filter
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
        { model: Queue, as: 'queue', attributes: [] },
        { model: User, as: 'user', attributes: [] },
        { model: Service, as: 'service', attributes: [] }
      ]
    });

    // Fetch bookings
    const bookings = await Booking.findAll({
      where: { ...where, salonId },
      attributes: ['bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'amount', 'createdAt'],
      include: [
        { model: Queue, as: 'queue', attributes: ['queueNumber'] },
        { model: User, as: 'user', attributes: ['fullName', 'phoneNumber'] },
        { model: Service, as: 'service', attributes: ['serviceName'] }
      ],
      order: [['queue', 'queueNumber', 'ASC']],
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
};

/**
 * SALON OWNER: Detailed bookings list with search & barber info
 */
const salonOwnerListBookings = async (salonId, {
  page = 1,
  date = '',
  statusFilter = '',
  searchString = '',
  limit
} = {}) => {
  try {
    if (!salonId) throw new Error('salonId required');

    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = { salonId };

    // Date filter
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.bookingDate = { [Op.between]: [startOfDay, endOfDay] };
    }

    // Status filter
    if (statusFilter?.trim()) {
      where.bookingStatus = statusFilter.trim();
    }

    // Search filter
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { salonName: { [Op.iLike]: like } },
        { phoneNumber: { [Op.iLike]: like } },
        { city: { [Op.iLike]: like } },
        { addressLine1: { [Op.iLike]: like } }
      ];
    }

    // Count
    const totalBookings = await Booking.count({
      where,
      include: [
        { model: Queue, as: 'queue', attributes: [] },
        { model: User, as: 'user', attributes: [] },
        { model: Service, as: 'service', attributes: [] }
      ]
    });

    // Fetch detailed bookings
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId', 'bookingDate', 'bookingTime', 'bookingStatus'
      ],
      include: [
        { model: Queue, as: 'queue', attributes: ['queueNumber', 'tokenNumber'] },
        { model: User, as: 'user', attributes: ['fullName', 'phoneNumber', 'email'] },
        { model: Service, as: 'service', attributes: ['serviceName', 'price', 'durationMinutes'] },
        { model: Barber, as: 'barber', attributes: ['fullName', 'phoneNumber'] }
      ],
      order: [
        ['bookingDate', 'ASC'],
        [{ model: Queue, as: 'queue' }, 'queueNumber', 'ASC']
      ],
      limit: safeLimit,
      offset
    });


    return {
      bookings,
      totalBookings,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };
  } catch (error) {
    throw error;
  }
};

const getFiltersDropdownData = async () => {
  try {
    // Salons
    const salons = await Salon.findAll({
      attributes: ['salonId', 'salon_name'],
      order: [['salon_name', 'ASC']],
      where: { isActive: true }  
    });

    // Statuses
    const statuses = [
      { value: '', label: 'All Status' },
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' }
    ];

    return {
      salons,
      statuses
    };
  } catch (error) {
    throw error;
  }
};


// services/booking.service.js
/**
 * SALON: Complete service & advance queue (same pattern)
 */
const completeService = async (salonId, bookingId) => {
  try {
    console.log('🔍 completeService:', { salonId, bookingId });
    
    // 1. Find booking + queue details FIRST
    const booking = await Booking.findOne({
      where: { 
        bookingId, 
        salonId,
        bookingStatus: 'pending'
      },
      include: [
        { 
          model: Queue, 
          as: 'queue', 
          attributes: ['queueId', 'queueNumber', 'status'] 
        }
      ]
    });

    if (!booking) {
      throw new Error('Booking not found for this salon');
    }

    console.log('🔍 Queue details:', {
      queueId: booking.queue.queueId,
      queueNumber: booking.queue.queueNumber,
      queueStatus: booking.queue.status
    });

    const t = await db.sequelize.transaction();

    try {
      // 2. Update booking → completed
      await Booking.update(
        { 
          bookingStatus: 'completed',
          updatedAt: new Date()
        },
        { 
          where: { bookingId, salonId },
          transaction: t 
        }
      );

      // 3. Current queue → completed
      await Queue.update(
        { 
          status: 'completed',
          completedAt: new Date()
        },
        { 
          where: { 
            queueId: booking.queue.queueId,  // ✅ From findOne result
            salonId 
          },
          transaction: t 
        }
      );

      // 4. Next queue → in_service
      const nextQueueNumber = booking.queue.queueNumber + 1;
      const nextQueue = await Queue.findOne({
        where: { 
          salonId, 
          queueNumber: nextQueueNumber,
          status: 'waiting'
        },
        transaction: t
      });

      let nextQueueNumberActive = null;
      if (nextQueue) {
        await Queue.update(
          { 
            status: 'in_service',
            calledAt: new Date()
          },
          { 
            where: { queueId: nextQueue.queueId },
            transaction: t 
          }
        );
        nextQueueNumberActive = nextQueueNumber;
      }

      await t.commit();

      return {
        success: true,
        completedBookingId: bookingId,
        completedQueueNumber: booking.queue.queueNumber,
        nextQueueNumber: nextQueueNumberActive,
        message: `Queue ${booking.queue.queueNumber} → completed, next ${nextQueueNumberActive || 'none'}`
      };

    } catch (error) {
      await t.rollback();
      throw error;
    }

  } catch (error) {
    throw error;
  }
};


// services/booking.service.js - Add this
const userListBookings = async (userId, { 
  page = 1, 
  statusFilter = '', 
  date = '', 
  limit 
} = {}) => {
  try {
    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    const where = { userId };

    // Date filter
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
      where,
      include: [
        { model: Queue, as: 'queue', attributes: [] },
        { model: Service, as: 'service', attributes: [] },
        { model: Salon, as: 'salon', attributes: [] }
      ]
    });

    // Fetch bookings
    const bookings = await Booking.findAll({
      where,
      attributes: ['bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'amount'],
      include: [
        { model: Queue, as: 'queue', attributes: ['queueNumber', 'status'] },
        { model: Service, as: 'service', attributes: ['serviceName', 'durationMinutes'] },
        { model: Salon, as: 'salon', attributes: ['salonName', 'city','phoneNumber'] }
      ],
      order: [['bookingDate', 'DESC'], ['createdAt', 'DESC']],
      limit: safeLimit,
      offset
    });

    return {
      bookings,
      totalBookings,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };
  } catch (error) {
    throw error;
  }
};




// ✅ Export ALL functions
module.exports = {
  checkDuplicate,
  verifyService,
  getNextQueueNumber,
  createBooking,
  adminListBookings,
  salonListBookings,
  salonOwnerListBookings,
  getFiltersDropdownData,
  completeService,
  userListBookings
};
