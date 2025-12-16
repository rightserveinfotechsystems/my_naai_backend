// services/db.user.service.js
const { Op } = require('sequelize');
const db = require('../database/models');


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




module.exports = {
    getUserByPhone,
    getUserById,
    createUser,
    updateUser,
};
