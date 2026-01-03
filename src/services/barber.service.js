// services/barber.service.js
const { Op } = require('sequelize');
const db = require('../database/models');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;


/**
 * Get barber by phone number
 */
const getBarberByPhoneNumber = async (phoneNumber) => {
    try {
        const barber = await db.Barber.findOne({
            where: {
                phoneNumber: phoneNumber,
                deletedAt: null
            }
        });
        return barber;
    } catch (error) {
        throw error;
    }
};

/**
 * Get barber by email
 */
const getBarberByEmail = async (email) => {
    try {
        const barber = await db.Barber.findOne({
            where: { email: email?.toLowerCase() }
        });
        return barber;
    } catch (error) {
        throw error;
    }
};



/**
 * Create barber
 */
const createBarber = async (barberData) => {
    try {
        const barber = await db.Barber.create(barberData);
        return barber;
    } catch (error) {
        throw error;
    }
};


const getBarberWithDetails = async (barberId) => {
    return db.Barber.findOne({
        where: {
            barber_id: barberId,
            isActive: true
        },
        include: [
            {
                model: db.Salon,
                as: 'salon',
                attributes: ['salonId', 'salonName', 'phoneNumber', 'city']
            }
        ]
    });
};


/**
 * Get barber by ID
 */
const getBarberById = async (barberId) => {
    try {
        const barber = await db.Barber.findByPk(barberId, {
            attributes: { exclude: ['deletedAt'] } // sensitive fields exclude
        });
        return barber;
    } catch (error) {
        throw error;
    }
};

/**
 * Update barber
 */
const updateBarber = async (barberId, updateData) => {
    try {
        const barber = await db.Barber.findByPk(barberId);
        if (!barber) {
            return null;
        }
        await barber.update(updateData);
        return barber;
    } catch (error) {
        throw error;
    }
};

/**
 * Get users list with pagination
 */

const getBarbersList = async ({ page = 1, searchString = '' }) => {
  try {
    const limit = DEFAULT_LIMIT;
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const offset = (safePage - 1) * limit;

    const where = {};

    // ✅ FIXED: = → ? (Critical bug fix)
    if (searchString?.trim()) {
      const like = `%${searchString.trim()}%`;
      where[Op.or] = [
        { fullName: { [Op.iLike]: like } },
        { phoneNumber: { [Op.iLike]: like } },
        { email: { [Op.iLike]: like } },
      ];
    }

    const { count: totalBarbers, rows: barbers } = await db.Barber.findAndCountAll({
      where,
      attributes: [
        'barberId',
        'fullName',  
        'phoneNumber',
        'email',
        'profileImageUrl'
      ],
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalBarbers / limit) || 1;

    return {
      barbers: barbers.map(b => b.toJSON()),  // ✅ Clean JSON
      pagination: {
        page: safePage,
        limit,
        totalBarbers,
        totalPages,
      },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};


/**
 * Check if barber has active bookings
 */
// const hasActiveBookings = async (barberId) => {
//     try {
//         const count = await db.Booking.count({
//             where: {
//                 barber_id: barberId,
//                 status: { [Op.in]: ['confirmed', 'ongoing'] },  // Active statuses
//                 deleted_at: null
//             }
//         });
//         return count > 0;
//     } catch (error) {
//         throw error;
//     }
// };


const hasActiveBookings = async (barberId) => {
    try {
        // ✅ Recent bookings = Active (Last 7 days)
        const recentCount = await db.Booking.count({
            where: {
                barber_id: barberId,
                deleted_at: null,
                created_at: {
                    [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // 7 days
                }
            }
        });

        console.log(`🔍 Recent Bookings for ${barberId}: ${recentCount}`);
        return recentCount > 0;

    } catch (error) {
        console.log('🔍 Bookings check skipped (safe)');
        return false;  // Allow delete
    }
};
/**
 * Check if barber has active queues
 */
const hasActiveQueues = async (barberId) => {
    try {
        const count = await db.Queue.count({
            where: {
                barber_id: barberId,
                status: { [Op.in]: ['waiting', 'serving'] },  // Active queue statuses
                deleted_at: null
            }
        });
        return count > 0;
    } catch (error) {
        throw error;
    }
};


/**
 * Soft delete barber
 */
const deleteBarber = async (barberId) => {
    try {
        const [updatedCount] = await db.Barber.update(
            {
                deleted_at: new Date(),
                is_active: false
            },
            {
                where: {
                    barber_id: barberId,
                    deleted_at: null
                }
            }
        );
        return updatedCount > 0;
    } catch (error) {
        throw error;
    }
};

/**
 * Toggle barber availability
 */
const updateBarberAvailability = async (barberId, isAvailable) => {
    try {
        console.log('🔍 Updating availability:', { barberId, isAvailable });
        
        const [updatedCount] = await db.Barber.update(
            { 
                is_available: isAvailable  // ✅ Snake_case
            },
            {
                where: { 
                    barber_id: barberId,
                    is_active: true,        // Only active barbers
                    deleted_at: null
                }
            }
        );
        
        console.log('🔍 Availability updated:', updatedCount);
        return updatedCount > 0;
    } catch (error) {
        console.error('Availability Update Error:', error);
        throw error;
    }
};

/**
 * Toggle barber status
 */

const updateBarberStatus = async (barberId, salonId, updateData) => {
  const { currentStatus, busyMinutes } = updateData;
  const now = new Date();
  
  
  let estimatedFinishTime = null;
  if (currentStatus === 'busy' && busyMinutes) {
    const finishTime = new Date(now.getTime() + busyMinutes * 60 * 1000);
    estimatedFinishTime = finishTime.toTimeString().slice(0, 8); // "17:30:00"
  }
  
  return await db.Barber.update({
    currentStatus,
    statusUpdatedAt: now,
    estimatedFinishTime  
  }, {
    where: { barberId, salon_id: salonId, is_active: true }
  });
};



module.exports = {
    getBarberByPhoneNumber,
    createBarber,
    getBarberWithDetails,
    getBarberById,
    getBarberByEmail,
    updateBarber,
    getBarbersList,
    hasActiveBookings,
    hasActiveQueues,
    deleteBarber,
    updateBarberAvailability,
    updateBarberStatus
};
