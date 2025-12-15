
const { Op } = require('sequelize');
const Salon = require("../database/models/salon.model");
/**
 * Create salon
 */
const createSalon = async (salonData) => {
    try {
        const salon = await Salon.create(salonData);
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
        const salon = await Salon.findByPk(salonId);
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
        const salon = await Salon.findByPk(salonId, {
            include: [
                {
                    model: Barber,
                    as: 'barbers',
                    where: { isActive: true },
                    required: false,
                    attributes: ['barberId', 'fullName', 'specialization', 'isAvailable']
                },
                {
                    model: Service,
                    as: 'services',
                    where: { isActive: true },
                    required: false,
                    attributes: ['serviceId', 'serviceName', 'durationMinutes', 'price']
                }
            ]
        });
        return salon;
    } catch (error) {
        throw error;
    }
};

/**
 * Update salon
 */
const updateSalon = async (salonId, updateData) => {
    try {
        const salon = await Salon.findByPk(salonId);
        if (!salon) {
            return null;
        }
        await salon.update(updateData);
        return salon;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete salon
 */
const deleteSalon = async (salonId) => {
    try {
        const salon = await Salon.findByPk(salonId);
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
const listSalons = async (filters = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            city,
            state,
            pincode,
            isActive,
            isOpen
        } = filters;

        const offset = (page - 1) * limit;
        const whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { salonName: { [Op.iLike]: `%${search}%` } },
                { ownerName: { [Op.iLike]: `%${search}%` } },
                { phoneNumber: { [Op.like]: `%${search}%` } }
            ];
        }

        if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
        if (state) whereClause.state = { [Op.iLike]: `%${state}%` };
        if (pincode) whereClause.pincode = pincode;
        if (isActive !== undefined) whereClause.isActive = isActive;
        if (isOpen !== undefined) whereClause.isOpen = isOpen;

        const { count, rows } = await Salon.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        return {
            salons: rows,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Check if salon has active queues
 */
const hasActiveQueues = async (salonId) => {
    try {
        const count = await Queue.count({
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

module.exports = {
    createSalon,
    getSalonById,
    getSalonWithDetails,
    updateSalon,
    deleteSalon,
    listSalons,
    hasActiveQueues
};