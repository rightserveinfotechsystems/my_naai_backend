const { Op } = require('sequelize');
const Admin = require('../database/models/admin.model');
/**
 * Get admin by email
 */
const getAdminByEmail = async (email) => {
    try {
        const admin = await Admin.findOne({
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
        const admin = await Admin.findByPk(adminId, {
            attributes: { exclude: ['passwordHash'] }
        });
        return admin;
    } catch (error) {
        throw error;
    }
};

/**
 * Get admin by username or email
 */
const getAdminByUsernameOrEmail = async (identifier) => {
    try {
        const admin = await Admin.findOne({
            where: {
                [Op.or]: [
                    { username: identifier.toLowerCase() },
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
 * Create admin
 */
const createAdmin = async (adminData) => {
    try {
        const admin = await Admin.create(adminData);
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
        const admin = await Admin.findByPk(adminId);
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
        const admin = await Admin.findByPk(adminId);
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
        const { page = 1, limit = 10, search, role, isActive } = filters;
        const offset = (page - 1) * limit;

        const whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { fullName: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (role) {
            whereClause.role = role;
        }

        if (isActive !== undefined) {
            whereClause.isActive = isActive;
        }

        const { count, rows } = await Admin.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['passwordHash'] },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        return {
            admins: rows,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
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
    listAdmins
};