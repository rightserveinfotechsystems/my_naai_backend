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
  static async getNextQueueNumber(salonId) {
    const lastQueue = await Queue.findOne({
      where: { salonId },
      order: [['queueNumber', 'DESC']]
    });
    return lastQueue ? lastQueue.queueNumber + 1 : 1;
  }

  // 4. Create Queue + Booking (transaction me)
  static async createBooking(salonId, userId, serviceId, bookingDate, queueNumber) {
    const t = await db.sequelize.transaction();
    try {
      // Queue banao
      const queue = await Queue.create({
        salonId,
        userId,
        serviceId,
        queueNumber,
        // tokenNumber: queueNumber
      }, { transaction: t });

      // Booking banao
      const booking = await Booking.create({
        queueId: queue.queueId,
        salonId,
        userId,
        serviceId,
        bookingDate,
        bookingStatus: 'pending'
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
