// services/db.user.service.js
const { Op } = require('sequelize');
const db = require('../database/models');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;


/**
 * Create user
 */
const createUser = async (userData) => {
    try {
        const user = await     db.User.create(userData);
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
        await user.update(updateData);
        return user;
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

    if (searchString=(searchString?.trim())) {
      const like = `%${searchString}%`;
      where[Op.or] = [
        { fullName:    { [Op.iLike]: like } },
        { phoneNumber: { [Op.iLike]: like } },
        { email:       { [Op.iLike]: like } },
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



module.exports = {
    getUserByPhone,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
    getUserList
};
