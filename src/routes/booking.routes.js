const express = require('express');
const { createBooking } = require('../controller/booking/addBooking');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');

const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const salonGetBookingList = require('../controller/booking/getSalonBookingList');
const adminGetBookingList = require('../controller/booking/getBookingList');
const getFiltersDropdown = require('../controller/booking/getFiltersDropdown');
const { completeService } = require('../controller/booking/completeService');
const userGetBookingList = require('../controller/booking/userBookingList');
const adminGetAllBookings = require('../controller/booking/adminGetAllBookings');





const bookingRouter = express.Router();

bookingRouter.post('/book',authenticateUser, createBooking);
bookingRouter.post('/get-list', authenticateUser, userGetBookingList);

bookingRouter.post('/list', authenticateAdmin, adminGetBookingList);
bookingRouter.get('/filter-list', authenticateAdmin, getFiltersDropdown);
bookingRouter.get('/get-all-list', authenticateAdmin, adminGetAllBookings);



bookingRouter.post('/get-booking-list', authenticateSalon, salonGetBookingList);
bookingRouter.post('/booking-complete', authenticateSalon, completeService);


module.exports = bookingRouter;