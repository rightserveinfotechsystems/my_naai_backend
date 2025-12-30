// services/booking.service.js
const db = require('../database/models');
const { Booking, Queue, Service } = db;
const { Op } = require('sequelize');

class BookingService {
  // 1. Check duplicate booking (user + salon + date)
  static async checkDuplicate(salonId, userId, bookingDate) {
    return await db.Booking.findOne({
      where: { 
        salonId, 
        userId, 
        bookingDate 
      }
    });
  }

  //
  static async verifyService(salonId, serviceId) {
    return await Service.findOne({
      where: { salonId, serviceId }
    });
  }

  // 3. Get next queue number
static async getNextQueueNumber(salonId, bookingDate) {
  const dateString = new Date(bookingDate).toISOString().split('T')[0];
  const count = await Queue.count({
    where: { salonId, bookingDate: dateString }
  });
  return count + 1;
}

  // 4. Create Queue + Booking 
  static async createBooking(salonId, userId, serviceId, bookingDate, queueNumber, bookingTime) {
    const t = await db.sequelize.transaction();
    try {
      // Queue 
      const queue = await Queue.create({
        salonId,
        userId,
        serviceId,
        queueNumber,
        tokenNumber: queueNumber,
        bookingDate
      }, { transaction: t });

      // Booking 
      const booking = await Booking.create({
        queueId: queue.queueId,
        salonId,
        userId,
        serviceId,
        bookingDate,
        bookingStatus: 'pending',
        bookingTime
      }, { transaction: t });

      await t.commit();
      return { queue, booking };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = BookingService;
