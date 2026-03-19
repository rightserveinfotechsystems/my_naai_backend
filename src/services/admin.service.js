const { Op } = require('sequelize');
const db = require('../database/models');
/**
 * Get admin by email
 */
const getAdminByEmail = async (email) => {

    try {
        const admin = await db.Admin.findOne({
            where: { email: email.toLowerCase() }
        });
        return admin;
    } catch (error) {
        throw error;
    }
};

/**
 * Get admin by ID
 */
const getAdminById = async (adminId) => {
    try {
        const admin = await db.Admin.findByPk(adminId, {
            attributes: { include: ['password'] }
        });
        return admin;
    } catch (error) {
        throw error;
    }
};

/**
 * Update user
 */
const updateAdminPanelUser = async (userId, updateData) => {
    try {
        const user = await db.Admin.findByPk(userId);
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
 * Get admin by username or email
 */
const getAdminByUsernameOrEmail = async (identifier) => {
    try {
        const admin = await db.Admin.findOne({
            where: {
                [Op.or]: [
                    // { username: identifier.toLowerCase() },
                    { email: identifier.toLowerCase() }
                ]
            }
        });
        return admin;
    } catch (error) {
        throw error;
    }
};



/**
 * Get user by phone number
 */
// const getAdminUserByPhone = async (phoneNumber) => {
//     try {
//         const user = await db.User.findOne({
//             where: { phoneNumber }
//         });
//         return user;
//     } catch (error) {
//         throw error;
//     }
// };

const getAdminUserByPhone = async (phoneNumber) => {
    try {
        const user = await db.Admin.findOne({
            where: { mobile: phoneNumber }
        });
        return user;
    } catch (error) {
        throw error;
    }

};



/**
 * Get user by email
 */
const getAdminUserByEmail = async (email) => {
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
 * Create admin
 */
const createAdmin = async (adminData) => {
    try {
        const admin = await db.Admin.create(adminData);
        return admin;
    } catch (error) {
        throw error;
    }
};

/**
 * Update admin
 */
const updateAdmin = async (adminId, updateData) => {
    try {
        const admin = await db.Admin.findByPk(adminId);
        if (!admin) {
            return null;
        }
        await admin.update(updateData);
        return admin;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete admin
 */
const deleteAdmin = async (adminId) => {
    try {
        const admin = await db.Admin.findByPk(adminId);
        if (!admin) {
            return null;
        }
        await admin.destroy();
        return true;
    } catch (error) {
        throw error;
    }
};

/**
 * List admins with pagination
 */

const listAdmins = async (filters = {}) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            searchString,
            role,
            isActive,
        } = filters;

        const offset = (page - 1) * limit;
        const keyword = search || searchString;

        const whereClause = {};

        /* 🔍 SEARCH */
        if (keyword && keyword.trim()) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${keyword}%` } },
                { email: { [Op.iLike]: `%${keyword}%` } },
                { mobile: { [Op.iLike]: `%${keyword}%` } }, // 👈 added
            ];
        }

        /* 🎭 ROLE FILTER */
        if (role) {
            whereClause.role = role;
        }

        /* ✅ ACTIVE FILTER */
        if (typeof isActive === "boolean") {
            whereClause.isActive = isActive;
        }

        const { count, rows } = await db.Admin.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ["password"] },
            limit: Number(limit),
            offset: Number(offset),
            order: [["createdAt", "DESC"]],
        });

        return {
            admins: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit),
        };
    } catch (error) {
        throw error;
    }
};


module.exports = {
    getAdminByEmail,
    getAdminById,
    getAdminByUsernameOrEmail,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    listAdmins,
    getAdminUserByPhone,
    getAdminUserByEmail,
    updateAdminPanelUser
};