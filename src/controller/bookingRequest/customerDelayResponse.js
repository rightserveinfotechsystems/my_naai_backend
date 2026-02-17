const db = require('../../database/models');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const customerDelayResponse = async (req, res) => {
  try {
    const { bookingRequestId, response } = req.body;
    // response = 'accepted' | 'rejected'

    const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId);
    if (!bookingRequest) {
      return res.status(404).json({ status: 'FAILED', message: 'Booking request not found' });
    }

    if (bookingRequest.status !== 'delay_requested') {
      return res.status(400).json({
        status: 'FAILED',
        message: 'No delay request pending'
      });
    }

    // ❌ CUSTOMER REJECTS
    if (response === 'rejected') {
      bookingRequest.status = 'cancelled';
      await bookingRequest.save();

      await sendNotificationToDevice({
        salonId: bookingRequest.salonId,
        title: 'Booking Cancelled',
        body: 'Customer rejected delayed booking'
      });

      return res.json({
        status: 'SUCCESS',
        message: 'Booking cancelled'
      });
    }

    // ✅ CUSTOMER ACCEPTS → CREATE FINAL BOOKING
    if (response === 'accepted') {
      const finalTime = bookingRequest.bookingTime; // frontend adjust karega

      await db.Booking.create({
        salonId: bookingRequest.salonId,
        userId: bookingRequest.userId,
        barberId: bookingRequest.barberId,
        bookingDate: bookingRequest.bookingDate,
        bookingTime: finalTime,
        services: bookingRequest.services,
        bookingStatus: 'confirmed'
      });

      bookingRequest.status = 'completed';
      await bookingRequest.save();

      await sendNotificationToDevice({
        salonId: bookingRequest.salonId,
        title: 'Booking Confirmed',
        body: 'Customer accepted delayed booking'
      });

      return res.json({
        status: 'SUCCESS',
        message: 'Booking confirmed'
      });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'FAILED', message: err.message });
  }
};

module.exports = { customerDelayResponse };