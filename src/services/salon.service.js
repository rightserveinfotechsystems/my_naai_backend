const { Op, literal } = require('sequelize');
const db = require('../database/models');


const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
const RADIUS = parseFloat(process.env.NEARBY_SALON_RADIUS) || 5;

/**
 * Create salon
 */
const createSalon = async (salonData, transaction = null) => {
  try {
    const salon = await db.Salon.create(salonData, {
      transaction
    });
    return salon;
  } catch (error) {
    throw error;
  }
};


/**
 * Get salon by ID
 */
const getSalonById = async (salonId) => {
  try {
    const salon = await db.Salon.findByPk(salonId);
    return salon;
  } catch (error) {
    throw error;
  }
};

/**
 * Get salon by phone number
 */
const getSalonByPhone = async (phoneNumber) => {
  try {
    const salon = await db.Salon.findOne({
      where: { phoneNumber }
    });
    return salon;
  } catch (error) {
    throw error;
  }
};


/**
 * Get salon by email
 */
const getSalonByEmail = async (email) => {
  try {
    const salon = await db.Salon.findOne({
      where: { email }
    });
    return salon;
  } catch (error) {
    throw error;
  }
};

/**
 * Get salon with details
 */
const getSalonWithDetails = async (salonId) => {
  try {
    const salon = await db.Salon.findByPk(salonId, {
      include: [
        {
          model: db.Barber,
          as: 'barbers',
          where: { isActive: true },
          required: false,
          attributes: ['barberId', 'fullName', 'specialization', 'profileImageUrl', 'isAvailable', 'phoneNumber', 'email', 'isActive', 'ratingAverage',],
        },
        {
          model: db.Service,
          as: 'services',
          where: { isActive: true },
          required: false,
          attributes: ['serviceId', 'serviceName', 'durationMinutes', 'price', 'description'],
        },
        {
          model: db.BusinessHours,
          as: 'businessHours',
          required: false,
          attributes: ['scheduleId', 'openingTime', 'closingTime', 'breakStartTime', 'breakEndTime', 'holidayDays'
          ],
        },
        {
          model: db.Admin,
          as: 'creatorAdmin',
          attributes: ['id', 'name', 'mobile']
        }

        // {
        //   model: db.Booking,
        //   as: 'bookings',
        //   required: false,
        //   attributes: ['bookingId', 'userId', 'serviceId', 'barberId', 'createdAt'],
        //   include: [
        //     {
        //       model: db.Queue,
        //       as: 'queue',  
        //       attributes: ['queueNumber'],
        //     },
        //     {
        //       model: db.User,
        //       as: 'user', 
        //       attributes: ['fullName', 'phoneNumber'],
        //     }
        //   ],
        //   order: [['createdAt', 'ASC']],
        // }
      ],
    });
    if (!salon) return null;

    const salonJson = salon.toJSON();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (Array.isArray(salonJson.businessHours)) {
      salonJson.businessHours = salonJson.businessHours.map(bh => ({
        ...bh,
        holidayDays: (bh.holidayDays || []).map(i => dayNames[i])
      }));
    }
    return salonJson;
  } catch (error) {
    throw error;
  }
};

/**
 * Get salon basic info + queue + barbers (SIMPLE VERSION)
 */
const getSalonBasicWithQueue = async (salonId) => {
  try {
    // ✅ Get today in IST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    // ✅ Next 3 days: today, tomorrow, day after tomorrow
    const day1 = today.toISOString().split('T')[0]; // today
    const day2 = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // tomorrow
    const day3 = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // day after tomorrow

    const bookingDates = [day1, day2, day3];

    const salon = await db.Salon.findByPk(salonId, {
      include: [
        {
          model: db.Barber,
          as: 'barbers',
          where: { isActive: true, isAvailable: true },
          required: false,
          attributes: ['barberId', 'fullName', 'profileImageUrl', 'specialization', 'isAvailable', 'ratingAverage'],
        },
        {
          model: db.Service,
          as: 'services',
          where: { isActive: true },
          required: false,
          attributes: ['serviceId', 'serviceName', 'durationMinutes', 'price', 'description'],
        },
        {
          model: db.BusinessHours,
          as: 'businessHours',
          required: false,
          attributes: ['scheduleId', 'openingTime', 'closingTime', 'breakStartTime', 'breakEndTime', 'holidayDays'],
        },
        {
          model: db.Product,
          as: 'products',
          where: { isAvailable: true },
          required: false,
          attributes: ['productId', 'productName', 'price', 'rating', 'stockStatus', 'productImage'],
        }
      ],
    });

    if (!salon) return null;

    // ------------------------
    // BARBER-WISE DURATION TIME
    // ------------------------
    const barbersWithDuration = await Promise.all(
      salon.barbers.map(async (barber) => {
        const barberQueues = await db.Queue.findAll({
          where: {
            salonId: salonId,
            barberId: barber.barberId,
            status: { [Op.in]: ['waiting'] },
            bookingDate: { [Op.in]: bookingDates }
          },
          include: [{ model: db.Booking, as: 'booking', required: false }],
          attributes: ['queueId']
        });

        const durationMinutes = barberQueues.reduce((sum, q) => {
          const services = q.booking?.services || [];
          return sum + services.reduce((s, serviceItem) => s + Number(serviceItem.durationMinutes || 0), 0);
        }, 0);

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        return {
          ...barber.toJSON(),
          durationTime: `${hours}h ${minutes}m`
        };
      })
    );

    const salonJson = salon.toJSON();
    salonJson.barbers = barbersWithDuration;

    // ------------------------
    // SALON-LEVEL QUEUES
    // ------------------------
    const queues = await db.Queue.findAll({
      where: {
        salonId: salonId,
        status: 'waiting',
        bookingDate: { [Op.in]: bookingDates }
      },
      include: [{ model: db.Booking, as: 'booking', required: false }],
      attributes: ['queueNumber', 'estimatedWaitTime', 'bookingDate'],
      order: [['bookingDate', 'ASC'], ['queueNumber', 'ASC']]
    });

    // ------------------------
    // FETCH SALON BOOKINGS
    // ------------------------
    const salonBookings = await db.Booking.findAll({
      where: {
        salonId: salonId,
        bookingStatus: 'confirmed',
        bookingDate: { [Op.in]: bookingDates }
      },
      attributes: ['bookingDate', 'bookingTime', 'bookingEndTime']
    });

    // ------------------------
    // GROUP BOOKINGS BY DATE
    // ------------------------
    const bookedSlots = salonBookings.reduce((acc, b) => {
      if (!acc[b.bookingDate]) acc[b.bookingDate] = [];
      acc[b.bookingDate].push({
        start: b.bookingTime,
        end: b.bookingEndTime
      });
      return acc;
    }, {});

    const bookedSlotsArray = Object.keys(bookedSlots).map(date => ({
      date,
      slots: bookedSlots[date]
    }));

    salonJson.bookedSlots = bookedSlotsArray;

    // ------------------------
    // TOTAL WAIT TIME
    // ------------------------
    const totalMinutes = queues.reduce((sum, queue) => {
      const booking = queue.booking;
      if (booking?.services?.length) {
        return sum + booking.services.reduce((s, svc) => s + Number(svc.duration || 0), 0);
      }
      return sum;
    }, 0);

    salonJson.queueLength = queues.length;
    salonJson.totalWaitTime = {
      minutes: totalMinutes,
      display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    };

    // ------------------------
    // CONVERT HOLIDAY INDEX TO DAY NAMES
    // ------------------------
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (Array.isArray(salonJson.businessHours)) {
      salonJson.businessHours = salonJson.businessHours.map(bh => ({
        ...bh,
        holidayDays: (bh.holidayDays || []).map(i => dayNames[i])
      }));
    }

    return salonJson;

  } catch (error) {
    console.error('Error in getSalonBasicWithQueue:', error);
    throw error;
  }
};






/**
 * Update salon
 */
const updateSalon = async (salonId, updateData) => {
  try {
    const salon = await db.Salon.findByPk(salonId);
    if (!salon) {
      return null;
    }
    await salon.update(updateData);
    return salon;
  } catch (error) {
    throw error;
  }
};

// services/salon.service.js
const upsertBusinessHour = async (salonId, bh) => {
  const row = await db.BusinessHours.findOne({ where: { salonId } });

  if (row) {
    await row.update({
      openingTime: bh.openingTime,
      closingTime: bh.closingTime,
      breakStartTime: bh.breakStartTime || null,
      breakEndTime: bh.breakEndTime || null,
      holidayDays: bh.holidayDays || []
    });
  } else {
    await db.BusinessHours.create({
      salonId,
      openingTime: bh.openingTime,
      closingTime: bh.closingTime,
      breakStartTime: bh.breakStartTime || null,
      breakEndTime: bh.breakEndTime || null,
      holidayDays: bh.holidayDays || []
    });
  }
};


const syncSalonServices = async (salonId, services) => {
  // simplest option: delete all + recreate
  await db.Service.destroy({ where: { salonId } });

  for (const s of services) {
    await db.Service.create({
      salonId,
      serviceName: s.serviceName,
      durationMinutes: s.durationMinutes,
      price: Number(s.price),
      description: s.description || null
    });
  }
};

/**
 * Delete salon
 */
const deleteSalon = async (salonId) => {
  try {
    const salon = await db.Salon.findByPk(salonId);
    if (!salon) {
      return null;
    }
    await salon.destroy();
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * List salons with pagination and search
 */
const listSalons = async ({ page = 1, searchString = '', limit = 20, cityFilter = 'ALL', statusFilter = 'all', isAdmin, adminId }) => {
  try {
    const offset = (page - 1) * limit;
    const where = {
      deletedAt: null
    };

    if (!isAdmin) {
      where.createdBy = adminId
    }
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { salonName: { [Op.iLike]: like } },
        { phoneNumber: { [Op.iLike]: like } },
        { city: { [Op.iLike]: like } },
        { addressLine1: { [Op.iLike]: like } }
      ];
    }


    // ✅ City filter
    if (cityFilter !== 'ALL') {
      where.city = { [Op.iLike]: `%${cityFilter}%` };
    }

    // 👇 STATUS FILTER ADD:
    if (statusFilter === 'active') {
      where.isActive = true;
    } else if (statusFilter === 'inactive') {
      where.isActive = false;
    }

    // ✅ 1. SALON COUNT
    const totalSalons = await db.Salon.count({ where });

    // ✅ 2. SALONS FETCH
    const salons = await db.Salon.findAll({
      where,
      attributes: { exclude: ['deletedAt'] },
      include: [{
        model: db.Queue,
        as: 'queues',
        where: { status: 'waiting' },
        required: false,
        include: [{
          model: db.Service,
          as: 'service',
          required: false,
          attributes: ['durationMinutes']
        }],
        attributes: ['queueNumber'],
        order: [['queueNumber', 'ASC']]
      },
      {
        model: db.Admin,
        as: 'creatorAdmin',
        attributes: ['id', 'name', 'mobile']
      }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // ✅ 3. Calculate wait time (same)
    const salonsWithWaitTime = salons.map(salon => {
      const queues = salon.queues || [];
      const totalMinutes = queues.reduce((sum, queue) => sum + (queue.service?.durationMinutes || 15), 0);

      const salonData = salon.toJSON();
      delete salonData.queues;

      return {
        ...salonData,
        queueLength: queues.length,
        totalWaitTime: {
          minutes: totalMinutes,
          display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        }
      };
    });

    // ✅ 4. CORRECT PAGINATION
    return {
      salons: salonsWithWaitTime,
      totalSalons: totalSalons,  // ✅ SALON COUNT
      page,
      limit,
      totalPages: Math.ceil(totalSalons / limit)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * List salons with pagination for users (only active salons)
 */

const getActiveSalonsListForUsers = async ({
  page = 1,
  searchString = '',
  limit = DEFAULT_LIMIT,
  cityFilter = 'ALL',
  latitude,
  longitude,
  radius = RADIUS,
  userId,
  genderType
}) => {
  try {
    // Today's date in Asia/Kolkata
    const today = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    ).toISOString().split('T')[0];

    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    // ==================== COMMON INCLUDE ====================
    const salonIncludes = [
      {
        model: db.BusinessHours,
        as: 'businessHours',
        required: false,
        attributes: [
          'scheduleId',
          'openingTime',
          'closingTime',
          'breakStartTime',
          'breakEndTime',
          'holidayDays'
        ]
      }
    ];

    // ==================== BASE FILTER ====================
    const where = { isActive: true };

    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { salonName: { [Op.iLike]: like } },
        { phoneNumber: { [Op.iLike]: like } },
        { city: { [Op.iLike]: like } },
        { addressLine1: { [Op.iLike]: like } }
      ];
    }

    if (cityFilter !== 'ALL') {
      where.city = { [Op.iLike]: `%${cityFilter}%` };
    }

    if (genderType === 'male' || genderType === 'female') {
      where.genderType = { [Op.in]: [genderType.toUpperCase(), 'UNISEX'] };
    }

    // ==================== SAVED SALONS ====================
    let savedSalons = [];
    if (userId) {
      const bookmarks = await db.Bookmark.findAll({
        where: { userId },
        include: [{
          model: db.Salon,
          as: 'salon',
          where: { isActive: true },
          required: true,
          attributes: { exclude: ['deletedAt'] },
          include: salonIncludes
        }],
        order: [['createdAt', 'DESC']]
      });
      savedSalons = bookmarks.map(b => b.salon);
    }
    const savedSalonIds = savedSalons.map(s => s.salonId);

    // ==================== NEARBY SALONS ====================
    let nearbySalons = [];
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const maxDistance = parseFloat(radius);

      const distanceFormula = `(6371 * acos(
        cos(radians(${userLat})) * cos(radians("latitude")) * cos(radians("longitude") - radians(${userLng})) +
        sin(radians(${userLat})) * sin(radians("latitude"))
      ))`;

      const allSalonsWithDistance = await db.Salon.findAll({
        attributes: {
          include: [[literal(distanceFormula), 'distance']]
        },
        // where,
        // order: literal(`${distanceFormula} ASC`)
        where: {
          ...where,
          latitude: { [Op.ne]: null },
          longitude: { [Op.ne]: null }
        },
        include: salonIncludes,   // ✅ FIX
        order: literal(`${distanceFormula} ASC`),
        subQuery: false,
        distinct: true
      });

      // console.log('=== DISTANCE DEBUG ===');
      // allSalonsWithDistance.forEach((salon, index) => {
      //   const distance = parseFloat(salon.get('distance'));
      //   console.log(`${index + 1}. ${salon.salonName}: ${distance.toFixed(2)} km`);
      // });
      // nearbySalons = allSalonsWithDistance.filter();
      // console.log('=== FILTERED NEARBY (sorted) ===');
      // nearbySalons.forEach((salon, index) => {
      //   const distance = parseFloat(salon.get('distance'));
      //   console.log(`${index + 1}. ${salon.salonName}: ${distance.toFixed(2)} km`);
      // });
      nearbySalons = allSalonsWithDistance
        .filter(s => {
          const distance = parseFloat(s.get('distance'));
          return (
            !isNaN(distance) &&
            distance <= maxDistance &&
            !savedSalonIds.includes(s.salonId)
          );
        })
        .sort((a, b) => {
          return parseFloat(a.get('distance')) - parseFloat(b.get('distance'));
        });
    }
    const nearbySalonIds = nearbySalons.map(s => s.salonId);

    // ==================== REMAINING SALONS ====================
    const excludedSalonIds = [...savedSalonIds, ...nearbySalonIds];

    const remainingWhere = {
      ...where,
      ...(excludedSalonIds.length && { salonId: { [Op.notIn]: excludedSalonIds } })
    };

    const remainingSalons = await db.Salon.findAll({
      where: remainingWhere,
      attributes: { exclude: ['deletedAt'] },
      include: salonIncludes,
      //  [{
      //   model: db.Queue,
      //   as: 'queues',
      //   required: false,
      //   where: {
      //     status: 'waiting', 
      //     bookingDate: today
      //   }
      // include: [{
      //   model: db.Booking,
      //   as: 'booking',
      //   required: false 
      // }]
      // }],
      order: [['createdAt', 'DESC']],
      subQuery: false,
      distinct: true
    });

    // ==================== MERGE AND PAGINATE ====================
    const allSalons = [
      ...savedSalons,                                   //  always top
      ...nearbySalons.sort((a, b) =>
        parseFloat(a.get('distance')) - parseFloat(b.get('distance'))
      ),                                                //  distance wise
      ...remainingSalons                                //  last
    ];

    // ==================== PAGINATION ====================
    const start = (safePage - 1) * limit;
    const end = start + limit;
    const paginatedSalons = allSalons.slice(start, end);

    // ==================== CALCULATE WAIT TIME ====================
    const salonsWithWaitTime = paginatedSalons.map(salon => {
      // const queues = (salon.queues || []);
      // const totalMinutes = queues.reduce(
      //   (sum, q) => sum + Number(q.estimatedWaitTime || 0),
      //   0
      // );

      const salonData = salon.toJSON();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      if (Array.isArray(salonData.businessHours)) {
        salonData.businessHours = salonData.businessHours.map(bh => ({
          ...bh,
          holidayDays: (bh.holidayDays || []).map(i => dayNames[i])
        }));
      }
      // delete salonData.queues;

      return {
        ...salonData,
        // queueLength: queues.length,
        // totalWaitTime: {
        //   minutes: totalMinutes,
        //   display: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        // },
        distance: salon.getDataValue
          ? parseFloat(salon.getDataValue('distance') || 0).toFixed(2)
          : null
      };
    });

    // ==================== RETURN ====================
    return {
      salons: salonsWithWaitTime,
      totalSalons: allSalons.length,
      page: safePage,
      limit,
      totalPages: Math.ceil(allSalons.length / limit)
    };

  } catch (error) {
    console.error("Error in getActiveSalonsListForUsers:", error);
    throw error;
  }
};






/**
 * filter api city wise
 */

const getCitiesService = async (statusFilter = 'all') => {
  try {
    const where = {
      city: { [Op.ne]: null }
    };

    // ✅ NEW: Optional Active/Inactive filter
    if (statusFilter === 'active') {
      where.isActive = true;
    } else if (statusFilter === 'inactive') {
      where.isActive = false;
    }
    // 'all' or no param → All cities (existing behavior)

    const cities = await db.Salon.findAll({
      attributes: ['city'],
      where,
      order: [['city', 'ASC']]
    });

    const cityNames = [...new Set(cities.map(c => c.get('city')))];

    return cityNames;
  } catch (error) {
    throw error;
  }
};

// ✅ USER SERVICE  filter api city wise
const getCitySalonsService = async (statusFilter = 'all') => {
  try {
    // ✅ User view: Only active salons + No status filter needed
    const where = {
      city: { [Op.ne]: null },
      isActive: true  // Only active salons for users
    };

    // statusFilter ignore (user ko inactive nahi dikhana)
    const cities = await db.Salon.findAll({
      attributes: ['city'],
      where,
      order: [['city', 'ASC']]
    });

    const cityNames = [...new Set(cities.map(c => c.get('city')))];
    return cityNames;
  } catch (error) {
    throw error;
  }
};




/**
 * Check if salon has active queues
 */
const hasActiveQueues = async (salonId) => {
  try {
    const count = await db.Queue.count({
      where: {
        salonId,
        status: ['waiting', 'in_service']
      }
    });
    return count > 0;
  } catch (error) {
    throw error;
  }
};



/**
 * Check if service has active queues
 */
const hasActiveQueueForService = async (serviceId) => {
  const count = await Queue.count({
    where: {
      serviceId,
      QueueStatus: ['pending']
    }
  });

  return count > 0;
};

/**
 * Get single service by serviceId
 */
const getServiceById = async (serviceId) => {
  try {
    const service = await db.Service.findOne({
      where: { serviceId },
      include: [{
        model: db.Salon,
        as: 'salon',
        attributes: ['salonId', 'salonName']
      }]
    });
    return service;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete salon service by serviceId
 */
const deleteSalonService = async (serviceId) => {
  try {
    const deletedCount = await db.Service.destroy({
      where: { serviceId }
    });
    return deletedCount > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete salon by admin
 */
const deleteSalonByAdmin = async (salonId) => {
  try {
    const salon = await db.Salon.findByPk(salonId);
    // phone modify 
    const updatedPhone = `${salon.phoneNumber}${Date.now().toString().slice(-4)}`;
    await salon.update(
      {
        phoneNumber: updatedPhone
      });
    // soft delete (paranoid)
    await salon.destroy();
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * fetch salon by
 */
const getSalonsByAgent = async ({ agentId, page = 1, searchString = '' }) => {
  try {
    const limit = DEFAULT_LIMIT;
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const offset = (safePage - 1) * limit;

    const where = { createdBy: agentId };

    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { salonName: { [Op.iLike]: like } },
        { ownerName: { [Op.iLike]: like } },
      ];
    }

    const { count: totalSalons, rows: salons } = await db.Salon.findAndCountAll({
      where,
      attributes: ['salonId', 'salonName', 'ownerName', 'planType', 'planEndDate', 'isActive', 'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalSalons / limit) || 1;

    return {
      salons,
      pagination: {
        page: safePage,
        limit,
        totalSalons,
        totalPages
      }
    };
  } catch (error) {
    console.error("Error in getSalonsByAgent service:", error);
    throw error;
  }
};


module.exports = {
  createSalon,
  getSalonById,
  getSalonByPhone,
  getSalonByEmail,
  getSalonWithDetails,
  updateSalon,
  deleteSalon,
  listSalons,
  getCitiesService,
  hasActiveQueues,
  syncSalonServices,
  upsertBusinessHour,
  getSalonBasicWithQueue,
  deleteSalonService,
  getServiceById,
  getCitySalonsService,
  hasActiveQueueForService,
  getActiveSalonsListForUsers,
  deleteSalonByAdmin,
  getSalonsByAgent
};