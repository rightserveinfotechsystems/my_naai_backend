// services/db.user.service.js
const { Op } = require('sequelize');
const db = require('../database/models');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;

const getUserBookedSalons = async (userId) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        {
          model: Salon,
          as: 'salon',
          attributes: ['salonId', 'salonName', 'city', 'addressLine1', 'imageUrl']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 🔥 unique salons map
    const salonMap = new Map();

    bookings.forEach((booking) => {
      if (!booking.salon) return;

      const salonId = booking.salon.salonId;

      if (!salonMap.has(salonId)) {
        salonMap.set(salonId, {
          salonId,
          salonName: booking.salon.salonName,
          city: booking.salon.city,
          addressLine1: booking.salon.addressLine1,
          imageUrl: booking.salon.imageUrl,
          totalBookings: 1,
          lastBookingDate: booking.bookingDate
        });
      } else {
        const existing = salonMap.get(salonId);
        existing.totalBookings += 1;
      }
    });

    return Array.from(salonMap.values());
  } catch (error) {
    throw error;
  }
};
/**
 * Create user
 */
const createUser = async (userData) => {
    try {
        const user = await db.User.create(userData);
        return user;
    } catch (error) {
        throw error;
    }
};


/**
 * Get user by phone number
 */
const getUserByPhone = async (phoneNumber) => {
    try {
        const user = await db.User.findOne({
            where: { phoneNumber }
        });
        return user;
    } catch (error) {
        throw error;
    }
};


/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
    try {
        const user = await db.User.findOne({
            where: { email: email?.toLowerCase() }
        });
        return user;
    } catch (error) {
        throw error;
    }
};



/**
 * Get user by ID
 */
const getUserById = async (userId) => {
    try {
        const user = await db.User.findByPk(userId, {
            attributes: { exclude: ['deletedAt'] } // sensitive fields exclude
        });
        return user;
    } catch (error) {
        throw error;
    }
};



/**
 * Update user
 */
const updateUser = async (userId, updateData) => {
    try {
        const user = await db.User.findByPk(userId);
        if (!user) {
            return null;
        }
        const updatedUser = await user.update(updateData);  // Update in DB
        return updatedUser;  // ✅ Return updated user
    } catch (error) {
        throw error;
    }
};

/**
 * Get users list with pagination
 */

const getUserList = async ({ page = 1, searchString = '' }) => {
    try {
        const limit = DEFAULT_LIMIT;
        const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
        const offset = (safePage - 1) * limit;

        const where = {};

        if (searchString = (searchString?.trim())) {
            const like = `%${searchString}%`;
            where[Op.or] = [
                { fullName: { [Op.iLike]: like } },
                { phoneNumber: { [Op.iLike]: like } },
                { email: { [Op.iLike]: like } },
            ];
        }

        const { count: totalUsers, rows: users } = await db.User.findAndCountAll({
            where,
            attributes: [
                'userId',
                'fullName',
                'phoneNumber',
                'email',
                'profileImageUrl',
                'isActive',
                'isVerified',
                'createdAt',
                'lastLogin'
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        const totalPages = Math.ceil(totalUsers / limit) || 1;

        const result = {
            users,
            pagination: {
                page: safePage,
                limit,
                totalUsers,
                totalPages,
            },
        };
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Hard delete
const deleteUser = async (userId) => {
    try {
        const user = await db.User.findByPk(userId);
        if (!user) {
            return null;
        }
        await user.destroy();
        return true;
    } catch (error) {
        throw error;
    }
};



// user.service.js - Updated methods
const deleteUsersBulk = async (userIds) => {
    try {
        // ✅ Check actual column name - userId ya id?
        const existingUsers = await db.User.findAll({
            where: { userId: userIds }  // ✅ userId use karo
        });

        if (existingUsers.length === 0) {
            return 0;
        }

        const deletedCount = await db.User.destroy({
            where: { userId: userIds }  // ✅ userId use karo
        });

        return deletedCount;
    } catch (error) {
        throw error;
    }
};

const getUsersByIds = async (userIds) => {
    return await db.User.findAll({
        where: { userId: userIds },
        attributes: ['userId']
    });
};


const getUserByIdSavedSalon = (userId) => {
    return db.User.findByPk(userId);
};


// const updateUserSavedSalon = async (userId, data) => {
//     const user = await db.User.findByPk(userId);
//     if (!user) return null;

//     return await user.update(data); 
// };


const updateUserSavedSalon = async (userId, salonId) => {

    const user = await db.User.findByPk(userId);

    if (!user) {
        return false;
    }

    if (user.savedSalonId && user.savedSalonId !== salonId) {
        return false; // User already has another salon saved
    }

    // Only update if no salon saved OR same salon (avoid duplicate calls)
    if (!user.savedSalonId || user.savedSalonId === salonId) {
        user.savedSalonId = salonId;
        await user.save();


        //  Verify from DB
        const freshUser = await db.User.findByPk(userId);
        return true;
    }

    return false;
};

const saveUserBookmark = async (userId, salonId) => {
    // 1️⃣ Check if user exists
    const user = await db.User.findByPk(userId);
    if (!user) return false;

    // 2️⃣ Check if bookmark already exists
    const existingBookmark = await db.Bookmark.findOne({
        where: { userId, salonId }
    });

    if (existingBookmark) {
        return false; // Already saved
    }

    // 3️⃣ Create new bookmark
    await db.Bookmark.create({
        userId,
        salonId
    });

    return true;
};

const removeUserSavedSalon = async (userId) => {
    // Verify user exists
    const user = await db.User.findByPk(userId);
    if (!user) {
        return false;
    }

    //  Check if user has salon saved
    if (!user.savedSalonId) {
        return false;
    }

    //  INSTANCE UPDATE - Set to NULL
    user.savedSalonId = null;
    await user.save();
    return true;
};

const removeUserBookmark = async (userId, salonId) => {
    const bookmark = await db.Bookmark.findOne({
        where: { userId, salonId }
    });

    if (!bookmark) return false;

    await bookmark.destroy();
    return true;
};


const toggleUserBookmark = async (userId, salonId) => {
    // Check if bookmark exists
    const existingBookmark = await db.Bookmark.findOne({
        where: { userId, salonId }
    });

    if (existingBookmark) {
        // If exists, remove it → unsave
        await existingBookmark.destroy();
        return false; // unsaved
    } else {
        // If not exists, create → save
        await db.Bookmark.create({ userId, salonId });
        return true; // saved
    }
};

const getUserSavedSalon = async (userId) => {
    try {
        return await db.Bookmark.findOne({
            where: { userId }
        });
    } catch (error) {
        throw error;
    }

};

const getSaveSalonList = async () => {
    try {
        return await db.Bookmark.findAll();
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getUserByPhone,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
    getUserList,
    deleteUser,
    getUsersByIds,
    deleteUsersBulk,
    updateUserSavedSalon,
    getUserByIdSavedSalon,
    removeUserSavedSalon,
    saveUserBookmark,
    removeUserBookmark,
    toggleUserBookmark,
    getUserSavedSalon,
    getSaveSalonList,
    getUserBookedSalons
};
