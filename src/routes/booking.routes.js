const express = require('express');
const { createBooking } = require('../controller/booking/addBooking');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
// const adminGetBookingList = require('../controller/booking/getadminBookingList');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const salonGetBookingList = require('../controller/booking/getSalonBookingList');
const adminGetBookingList = require('../controller/booking/getBookingList');
const getFiltersDropdown = require('../controller/booking/getFiltersDropdown');
const { completeService } = require('../controller/booking/completeService');





const bookingRouter = express.Router();

bookingRouter.post('/book',authenticateUser, createBooking);

bookingRouter.post('/list', authenticateAdmin, adminGetBookingList);
bookingRouter.get('/filter-list', authenticateAdmin, getFiltersDropdown)

bookingRouter.post('/get-booking-list', authenticateSalon, salonGetBookingList);
bookingRouter.post('/service-complete', authenticateSalon, completeService);


module.exports = bookingRouter;