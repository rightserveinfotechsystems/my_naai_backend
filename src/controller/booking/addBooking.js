// controllers/booking/createBooking.js
const BookingService = require('../../services/booking.service');
const { createBookingSchema } = require('../../validations/booking.validation');

const createBooking = async (request, response) => {
  try {

     const { error, value } = createBookingSchema.validate(request.body, {
      abortEarly: false
    });

    if (error) {
      return response.status(400).json({
        status: "FAILED",
        message: error.details[0].message
      });
    }

        const { salonId, userId, serviceId, bookingDate ,bookingTime , barberId} = value; 

    // const { 
    //   salonId, 
    //   userId, 
    //   serviceId, 
    //   bookingDate  
    // } = request.body;


   //past booking
    const today = new Date();
    today.setHours(0,0,0,0);

    const bookingDateObj = new Date(bookingDate);

    if (bookingDateObj < today) {
      return response.status(400).json({
        status: 'FAILED',
        message: 'You cannot book for a past date.'
      });
    }


    //  Service layer calls
    const existingBooking = await BookingService.checkDuplicate(salonId, userId, bookingDate, bookingTime);
    if (existingBooking) {
      return response.status(400).json({
        status: "FAILED",
        message: "You already done booking for this salon!"
      });
    }

    const service = await BookingService.verifyService(salonId, serviceId);
    if (!service) {
      return response.status(400).json({
        status: "FAILED",
        message: "Invalid service for this salon"
      });
    }

    const nextQueueNumber = await BookingService.getNextQueueNumber(salonId, bookingDate);

    //  Final booking create
    const { queue, booking } = await BookingService.createBooking(
      salonId, 
      userId, 
      serviceId, 
      bookingDate, 
      nextQueueNumber,
      bookingTime 
    );

    //  Success response
    return response.status(200).json({
      status: "SUCCESS",
      message: "Booking confirmed!",
      data: {
        bookingId: booking.bookingId,
        queueNumber: nextQueueNumber,
        bookingDate,
        bookingTime,
        serviceName: service?.serviceName,
        amount: service?.price
      }
    });

  } catch (error) {
    console.error('Booking error:', error);
    return response.status(500).json({
      status: "FAILED",
      message: error.message || "Something went wrong!"
    });
  }
};

module.exports = { createBooking };
