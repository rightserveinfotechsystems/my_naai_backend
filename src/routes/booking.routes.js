const express = require('express');
const { createBooking } = require('../controller/booking/addBooking');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');

const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const salonGetBookingList = require('../controller/booking/getSalonBookingList');
const adminGetBookingList = require('../controller/booking/getBookingList');
const getFiltersDropdown = require('../controller/booking/getFiltersDropdown');
const userGetBookingList = require('../controller/booking/userBookingList');
const adminGetAllBookings = require('../controller/booking/adminGetAllBookings');
const markBookingDone = require('../controller/booking/markComplete');
const getCompletedBookings = require('../controller/booking/completedBookingList');
const addWalkInCustomers = require('../controller/booking/createWalkInBooking');

const salonOwnerActionBooking = require('../controller/booking/salonOwnerActionBooking');
const customerDelayAction = require('../controller/booking/customerDelayAction');
const userCancelBooking = require('../controller/booking/cancelUserBooking');

const bookingRouter = express.Router();

bookingRouter.post('/book',authenticateUser, createBooking);
bookingRouter.post('/get-list', authenticateUser, userGetBookingList);

bookingRouter.post('/list', authenticateAdmin, adminGetBookingList);
bookingRouter.get('/filter-list', authenticateAdmin, getFiltersDropdown);
bookingRouter.get('/get-all-list', authenticateAdmin, adminGetAllBookings);



bookingRouter.post('/get-booking-list', authenticateSalon, salonGetBookingList);
bookingRouter.post('/booking-complete', authenticateSalon, markBookingDone);
bookingRouter.get('/get-completed-bookings', authenticateSalon, getCompletedBookings);
bookingRouter.post('/create-walk-in', authenticateSalon, addWalkInCustomers);
bookingRouter.post('/booking-request-cancel/:bookingRequestId', authenticateUser, userCancelBooking);


// Owner actions: ACCEPT / REJECT / DELAY
bookingRouter.post('/:bookingId/owner-action', authenticateSalon, salonOwnerActionBooking);

// Customer responds to delay request
bookingRouter.post('/:bookingId/customer-delay-action', authenticateUser, customerDelayAction);






module.exports = bookingRouter;