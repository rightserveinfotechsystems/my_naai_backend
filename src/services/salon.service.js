const { Op } = require('sequelize');
const db = require('../database/models');
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
        // {
        //   model: db.Barber,        
        //   as: 'barbers',
        //   where: { isActive: true },
        //   required: false,
        //   attributes: ['barberId', 'fullName', 'specialization', 'isAvailable'],
        // },
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
          attributes: [
            'scheduleId',
            'openingTime',
            'closingTime',
            'breakStartTime',
            'breakEndTime',
            'holidayDays'
          ],
        },


        {
          model: db.Booking,
          as: 'bookings',
          required: false,
          attributes: ['bookingId', 'userId', 'serviceId', 'barberId', 'createdAt'],
          include: [
            {
              model: db.Queue,
              as: 'queue',  // association name
              attributes: ['queueNumber'],
            },
            {
              model: db.User,
              as: 'user',   // association name
              attributes: ['fullName', 'phoneNumber'],
            }
          ],
          order: [['createdAt', 'ASC']],
        }
      ],
    });
    if (!salon) return null;

    const salonJson = salon.toJSON();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    const salon = await db.Salon.findByPk(salonId, {
      include: [
        // ✅ NEW: Barbers add
        {
          model: db.Barber,
          as: 'barbers',
          where: { isActive: true },
          required: false,
          attributes: ['barberId', 'fullName', 'specialization', 'isAvailable'],
        },
        {
          model: db.Service,
          as: 'services',
          where: { isActive: true },
          required: false,
          attributes: ['serviceId', 'serviceName', 'durationMinutes', 'price'],
        },
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
          ],
        }
      ],
    });

    if (!salon) return null;

    // ✅ NEW: Queue number calculation
    const currentQueueCount = await db.Queue.count({
      where: {
        salonId: salonId,
        status: ['waiting', 'in_service']
      }
    });

    const salonJson = salon.toJSON();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (Array.isArray(salonJson.businessHours)) {
      salonJson.businessHours = salonJson.businessHours.map(bh => ({
        ...bh,
        holidayDays: (bh.holidayDays || []).map(i => dayNames[i])
      }));
    }

    // ✅ ADD queue number to response
    salonJson.currentQueueNumber = currentQueueCount + 1;

    return salonJson;
  } catch (error) {
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
 * List salons with pagination
 */
const listSalons = async ({ page = 1, searchString = '', limit = 20, cityFilter = 'ALL' }) => {
  try {
    const offset = (page - 1) * limit;
    const where = {};

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

    // ✅ 1. SALON COUNT SEPARATE KARO
    const totalSalons = await db.Salon.count({ where });

    // ✅ 2. SALONS FETCH (queues ke saath)
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
      }],
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
 * filter api city wise
 */

const getCitiesService = async () => {
  try {
    const cities = await db.Salon.findAll({
      attributes: ['city'],         
      where: {
        city: { [Op.ne]: null }       
      },
      order: [['city', 'ASC']]
    });

    // Remove duplicates manually if needed
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
  getServiceById
};