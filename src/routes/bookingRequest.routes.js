const express = require('express');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { createBookingRequest } = require('../controller/bookingRequest/bookingRequest');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const { ownerActionBooking } = require('../controller/bookingRequest/ownerAction');
const { customerActionBooking } = require('../controller/bookingRequest/customerDelayResponse');
const { getBookingRequestById } = require('../controller/bookingRequest/getBookingRequest');
const { autoCancelBooking } = require('../controller/bookingRequest/autoCancelBookingRequest');
const bookingRequestRouter = express.Router();

bookingRequestRouter.post('/create-booking-request',authenticateUser, createBookingRequest)
bookingRequestRouter.post('/owner-action/:bookingRequestId',authenticateSalon, ownerActionBooking);
bookingRequestRouter.post('/customer-delay-response/:bookingRequestId',authenticateUser, customerActionBooking);
bookingRequestRouter.get('/get-bookingRequest-by-id/:bookingRequestId',authenticateSalon, getBookingRequestById);
bookingRequestRouter.post('/auto-cancel', autoCancelBooking);







module.exports = bookingRequestRouter;
