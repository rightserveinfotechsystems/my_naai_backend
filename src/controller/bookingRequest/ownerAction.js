const db = require('../../database/models');
const sendNotificationToDevice = require('../../firebase/sendNotification');

const ownerActionOnBookingRequest = async (req, res) => {
  try {
    const { bookingRequestId, action, delayMinutes } = req.body;
    // action = 'accepted' | 'rejected' | 'delayed'

    const bookingRequest = await db.BookingRequest.findByPk(bookingRequestId);
    if (!bookingRequest) {
      return res.status(404).json({ status: 'FAILED', message: 'Booking request not found' });
    }

    // 🚫 Already handled
    if (bookingRequest.status !== 'pending') {
      return res.status(400).json({
        status: 'FAILED',
        message: 'Booking request already processed'
      });
    }

    // ================= ACCEPT =================
    if (action === 'accepted') {
      bookingRequest.status = 'accepted';
      await bookingRequest.save();

      // 🔔 notify customer
      await sendNotificationToDevice({
        userId: bookingRequest.userId,
        title: 'Booking Confirmed',
        body: 'Your booking has been confirmed by salon'
      });

      return res.json({
        status: 'SUCCESS',
        message: 'Booking accepted'
      });
    }

    // ================= REJECT =================
    if (action === 'rejected') {
      bookingRequest.status = 'rejected';
      await bookingRequest.save();

      await sendNotificationToDevice({
        userId: bookingRequest.userId,
        title: 'Booking Rejected',
        body: 'Your booking request was rejected by salon'
      });

      return res.json({
        status: 'SUCCESS',
        message: 'Booking rejected'
      });
    }

    // ================= DELAY =================
    if (action === 'delayed') {
      if (![15, 30, 60].includes(delayMinutes)) {
        return res.status(400).json({
          status: 'FAILED',
          message: 'Invalid delay minutes'
        });
      }

      bookingRequest.status = 'delay_requested';
      bookingRequest.requestedDelayMinutes = delayMinutes;
      await bookingRequest.save();

      await sendNotificationToDevice({
        userId: bookingRequest.userId,
        title: 'Booking Time Change',
        body: `Can you come after ${delayMinutes} minutes?`,
        data: {
          bookingRequestId,
          delayMinutes
        }
      });

      return res.json({
        status: 'SUCCESS',
        message: 'Delay request sent to customer'
      });
    }

    return res.status(400).json({ status: 'FAILED', message: 'Invalid action' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'FAILED', message: err.message });
  }
};

module.exports = ownerActionOnBookingRequest ;