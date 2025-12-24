// services/barber.service.js
const { Op } = require('sequelize');
const db = require('../database/models');


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
module.exports = {
     getBarberByPhoneNumber,
    createBarber
};
