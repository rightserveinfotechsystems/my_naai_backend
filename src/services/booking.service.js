const db = require('../database/models');
const { Booking, Queue, Service, Salon, User, Barber } = db;
const { Op, Sequelize } = require('sequelize');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;

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
const createBooking = async (salonId, userId, serviceId, bookingDate, queueNumber, bookingTime, barberId) => {
  const t = await db.sequelize.transaction();
  try {
    // Create Queue first
    const queue = await Queue.create({
      salonId,
      userId,
      serviceId,
      queueNumber,
      tokenNumber: queueNumber,
      bookingDate,
      barberId
    }, { transaction: t });

    // Create Booking
    const booking = await Booking.create({
      queueId: queue.queueId, // ✅ Fixed: queue.id instead of queue.queueId
      salonId,
      userId,
      barberId,
      serviceId,
      bookingDate,
      bookingStatus: 'pending',
      bookingTime,
    }, { transaction: t });

    await t.commit();
    return { queue, booking };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// CORRECT - Remove 
const verifyBarber = async (salonId, barberId) => {
  try {
    return await db.Barber.findOne({
      where: { barberId, salonId },
      attributes: ['fullName']
    });
  } catch (error) {
    throw error;
  }
};

/**
 * ADMIN: List all bookings without pagination, search, status & date filters
 */


const adminListAllBookings = async () => {
  try {
    const where = {};

    // No filters, no search, no pagination

    const totalBookings = await Booking.count({
      where,
      include: [
        { model: Queue, as: 'queue', attributes: [], required: false },
        { model: Salon, as: 'salon', attributes: [], required: false },
        { model: User, as: 'user', attributes: [], required: false },
        { model: Service, as: 'service', attributes: [], required: false }
      ]
    });

    const bookings = await db.Booking.findAll({
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
      order: [['createdAt', 'DESC']]

    });

    return {
      bookings,
      totalBookings
    };
  } catch (error) {
    throw error;
  }
};



/**
 * ADMIN: List all bookings with pagination & simple search (listSalons pattern)
 */
const adminListBookings = async ({
  page = 1, searchString = '', statusFilter = '', bookingDate = '', salonFilter = ''
} = {}) => {
  try {
    const limit = DEFAULT_LIMIT;
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const offset = (safePage - 1) * limit;

    const where = {};


    // Salon filter ✅ NEW
    // ✅ FIXED: salon_name LIKE '%urban%'
    if (salonFilter?.trim()) {
      where['$salon.salon_name$'] = {
        [Op.iLike]: `%${salonFilter.trim()}%`
      };
    }

    // Status filter
    if (statusFilter?.trim()) {
      where.bookingStatus = statusFilter.trim();
    }

    // Booking date filter 
    if (bookingDate) {
      where.bookingDate = bookingDate;  // ✅ Exact string match for DATE

    }


    // ✅ SIMPLE SEARCH like listSalons
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { '$salon.salon_name$': { [Op.iLike]: like } },      // ✅ salon_name
        { '$user.full_name$': { [Op.iLike]: like } },         // ✅ full_name
        { '$user.phone_number$': { [Op.iLike]: like } },      // ✅ phone_number

      ];
    }
    // ✅ FIXED: Count with SAME includes
    const totalBookings = await Booking.count({
      where,
      include: [
        { model: Queue, as: 'queue', attributes: [], required: false },
        { model: Salon, as: 'salon', attributes: [], required: false },
        { model: User, as: 'user', attributes: [], required: false },
        // { model: Service, as: 'service', attributes: [] }
      ]
    });

    // Main query
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'amount', 'createdAt',
        [Sequelize.col('salon.salon_name'), 'salonName'],
        [Sequelize.col('user.full_name'), 'userName'],
        [Sequelize.col('user.phone_number'), 'userPhone'],
        [Sequelize.col('queue.queue_number'), 'queueNumber'],
        'services'
      ],
      include: [
        { model: Queue, as: 'queue', attributes: [] },
        { model: Salon, as: 'salon', attributes: [] },
        { model: User, as: 'user', attributes: [] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Format response to include service names and total price
    const formattedBookings = bookings.map(b => {
      const services = b.services;
      return {
        ...b.dataValues,
        serviceNames: services.map(s => s.serviceName).join(', '), // e.g., "Haircut, Shave"
        servicePrice: services.reduce((sum, s) => sum + parseFloat(s.price || 0), 0)
      };
    });

    return {
      bookings: formattedBookings,
      totalBookings,
      page,
      limit,
      totalPages: Math.ceil(totalBookings / limit)
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

    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const offset = (safePage - 1) * safeLimit;


    const where = {
      salonId,
      bookingStatus: 'pending'
    };

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
        { '$user.full_name$': { [Op.iLike]: like } },        // ✅ correct column name
        { '$user.phone_number$': { [Op.iLike]: like } },
        { walkinName: { [Op.iLike]: like } }
      ];

      const likeService = [{ serviceName: searchString.trim() }];
      where[Op.or].push({
        services: { [Op.contains]: likeService }
      });
    }

    // Count
    const totalBookings = await Booking.count({
      where,
      include: [
        { model: Queue, as: 'queue', attributes: [] },
        { model: User, as: 'user', attributes: [] },
        // { model: Service, as: 'service', attributes: [] }
      ]
    });

    // Fetch detailed bookings
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'services', 'walkinName',
        'walkinPhone'
      ],
      include: [
        { model: Queue, as: 'queue', attributes: ['queueNumber', 'tokenNumber'] },
        {
          model: User, as: 'user', attributes: [['full_name', 'fullName'], ['phone_number', 'phoneNumber']
          ]
        },
        { model: Barber, as: 'barber', attributes: ['fullName', 'phoneNumber'] }
      ],
      order: [
        ['bookingDate', 'ASC'],
        [{ model: Queue, as: 'queue' }, 'queueNumber', 'ASC']
      ],
      limit: safeLimit,
      offset
    });



    // ⬇️ FIND QUERY ke baad add karo
    const formattedBookings = bookings.map(b => {
      const services = b.services || [];

      return {
        bookingId: b.bookingId,
        bookingDate: b.bookingDate,
        bookingTime: b.bookingTime,
        bookingStatus: b.bookingStatus,
        queueNumber: b.queue?.queueNumber,
        // userName: b.user?.fullName,
        // userPhone: b.user?.phoneNumber,
        userName: b.user
          ? b.user.fullName
          : b.walkinName,

        userPhone: b.user
          ? b.user.phoneNumber
          : b.walkinPhone || '0000000000',

        barberName: b.barber?.fullName,
        serviceNames: services.map(s => s.serviceName).join(', '),
        servicePrice: services.reduce((sum, s) => sum + Number(s.price || 0), 0)
      };
    });


    return {
      bookings: formattedBookings,
      totalBookings,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(totalBookings / safeLimit)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * SALON OWNER: completed bookings list with search & barber info
 */
const salonOwnerCompletedBookings = async (
  salonId,
  {
    page = 1,
    date = '',
    searchString = '',
    limit
  } = {}
) => {
  try {
    if (!salonId) throw new Error('salonId required');

    const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
    const safeLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
    const offset = (page - 1) * safeLimit;

    // ONLY COMPLETED BOOKINGS
    const where = {
      salonId,
      bookingStatus: 'completed'
    };

    // Date filter
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.bookingDate = { [Op.between]: [startOfDay, endOfDay] };
    }

    // Search
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { '$user.fullName$': { [Op.iLike]: like } },
        { '$user.phoneNumber$': { [Op.iLike]: like } }
      ];
    }

    // Count
    const totalBookings = await Booking.count({
      where,
      include: [{ model: User, as: 'user', attributes: [] }]
    });

    // Fetch
    const bookings = await Booking.findAll({
      where,
      attributes: [
        'bookingId',
        'bookingDate',
        'bookingTime',
        'services'
      ],
      include: [
        { model: User, as: 'user', attributes: ['fullName', 'phoneNumber'] },
        { model: Barber, as: 'barber', attributes: ['fullName'] },
        { model: Queue, as: 'queue', attributes: ['queueNumber'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: safeLimit,
      offset
    });

    // Format response
    const formattedBookings = bookings.map(b => {
      const services = Array.isArray(b.services) ? b.services : [];
      const serviceNames = services.map(s => s.serviceName).join(', ');
      const totalAmount = services.reduce(
        (sum, s) => sum + Number(s.price || 0),
        0
      );

      return {
        bookingId: b.bookingId,
        bookingDate: b.bookingDate,
        bookingTime: b.bookingTime,
        userName: b.user?.fullName,
        userPhone: b.user?.phoneNumber,
        barberName: b.barber?.fullName,
        queueNumber: b.queue?.queueNumber,
        services: serviceNames,
        totalAmount,
      };
    });

    return {
      bookings: formattedBookings,
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
/**
 * SALON: Complete service & advance queue (same pattern)
 */
const completeService = async (salonId, bookingId) => {


  // Find pending booking with queue
  const booking = await Booking.findOne({
    where: { bookingId, salonId, bookingStatus: 'pending' },
    include: [{ model: Queue, as: 'queue', attributes: ['queueId', 'queueNumber', 'status'] }]
  });

  if (!booking) throw new Error('Booking already completed');

  // Start transaction
  const t = await db.sequelize.transaction();

  try {
    // Update booking → completed
    await Booking.update(
      { bookingStatus: 'completed', updatedAt: new Date() },
      { where: { bookingId, salonId }, transaction: t }
    );

    // Update current queue → completed
    await Queue.update(
      { status: 'completed', completedAt: new Date() },
      { where: { queueId: booking.queue.queueId, salonId }, transaction: t }
    );

    // Commit transaction
    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  // AFTER commit: fetch completed booking for response
  const completedBooking = await Booking.findOne({
    where: { bookingId, salonId },
    attributes: ['bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'services', 'amount'],
    include: [
      { model: User, as: 'user', attributes: ['fullName', 'phoneNumber'] },
      { model: Barber, as: 'barber', attributes: ['fullName'] },
      { model: Queue, as: 'queue', attributes: ['queueNumber'] }
    ]
  });

  const services = Array.isArray(completedBooking.services) ? completedBooking.services : [];

  return {
    success: true,
    message: 'Service completed successfully',
    data: {
      bookingId: completedBooking.bookingId,
      bookingDate: completedBooking.bookingDate,
      bookingTime: completedBooking.bookingTime,
      bookingStatus: completedBooking.bookingStatus,
      userName: completedBooking.user?.fullName,
      userPhone: completedBooking.user?.phoneNumber,
      barberName: completedBooking.barber?.fullName,
      queueNumber: completedBooking.queue?.queueNumber,
      services: services.map(s => s.serviceName).join(', '),
      totalAmount: services.reduce((sum, s) => sum + Number(s.price || 0), 0)
    },
  };
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
        // { model: Service, as: 'service', attributes: [] },
        { model: Salon, as: 'salon', attributes: [] },
        { model: Barber, as: 'barber', attributes: ['fullName'] }
      ]
    });

    // Fetch bookings
    const bookings = await Booking.findAll({
      where,
      attributes: ['bookingId', 'bookingDate', 'bookingTime', 'bookingStatus', 'amount', 'services'],
      include: [
        { model: Queue, as: 'queue', attributes: ['queueNumber', 'status'] },
        // { model: Service, as: 'service', attributes: ['serviceName', 'durationMinutes'] },
        { model: Salon, as: 'salon', attributes: ['salonName', 'city', 'phoneNumber', 'imageUrl'] },

        { model: Barber, as: 'barber', attributes: ['fullName'] }
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


const getBookingById = async (salonId, bookingId) => {
  return await Booking.findOne({
    where: { salonId, bookingId },
    attributes: ['bookingId', 'bookingDate', 'bookingStatus']
  });
};


const addWalkInCustomer = async ({ salonId, customerName, serviceDuration }) => {

  const today = new Date();
  // const walkInUser = await db.User.findOne({
  //   where: { phoneNumber: '0000000000' } 
  // });
  // if (!walkInUser) throw new Error('Default walk-in user not found. Please create one.');
  // 1️⃣ Get last queue number for this salon
  const lastQueue = await db.Queue.findOne({
    where: { salonId },
    order: [['queueNumber', 'DESC']]
  });
  const nextQueueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

  // 2️⃣ Create queue entry
  const queue = await db.Queue.create({
    // userId: walkInUser.userId,
    salonId,
    customerName,               // direct customer name
    bookingDate: today,
    queueNumber: nextQueueNumber,
    status: 'waiting',
    userId: null
  });

  // 3️⃣ Create booking entry
  const booking = await db.Booking.create({
    //  userId: walkInUser.userId, 
    salonId,
    queueId: queue.queueId,
    bookingDate: today,
    bookingStatus: 'pending',
    bookingType: 'WALK_IN',
    walkinName: customerName,

    services: [
      {
        serviceName: 'Walk-in Service',
        durationMinutes: serviceDuration,
        price: 0
      }
    ]
  });

  // 4️⃣ Update queue with bookingId
  await queue.update({ bookingId: booking.bookingId });

  // 5️⃣ Calculate total duration for salon queue
  //   const totalDurationResult = await db.Queue.findAll({
  //     where: { salonId },
  //     include: [{ model: db.Booking, as: 'booking' }]
  //   });


  // let totalDuration = 0;
  // totalDurationResult.forEach(q => {
  //     if (q.booking?.services?.length) {
  //       q.booking.services.forEach(s => {
  //         totalDuration += Number(s.durationMinutes) || 0; // ensure number addition
  //       });
  //     }
  // });

  return {
    message: `Customer added to queue`,
    queue: {
      queueId: queue.queueId,
      bookingId: booking.bookingId,
      customerName,
      queueNumber: nextQueueNumber,
      status: 'waiting',
      serviceDuration
    },
  };
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
  userListBookings,
  verifyBarber,
  adminListAllBookings,
  salonOwnerCompletedBookings,
  getBookingById,
  addWalkInCustomer
};
