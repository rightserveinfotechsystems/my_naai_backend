const express = require('express');
const { createBooking } = require('../controller/booking/addBooking');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const adminGetBookingList = require('../controller/booking/getadminBookingList');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const salonGetBookingList = require('../controller/booking/getSalonBookingList');



const bookingRouter = express.Router();

bookingRouter.post('/book',authenticateUser, createBooking);

bookingRouter.post('/list', authenticateAdmin, adminGetBookingList);

bookingRouter.post('/get-booking-list', authenticateSalon, salonGetBookingList)


module.exports = bookingRouter;