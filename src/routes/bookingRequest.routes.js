const express = require('express');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { createBookingRequest } = require('../controller/bookingRequest/bookingRequest');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const { ownerActionBooking } = require('../controller/bookingRequest/ownerAction');
const { customerActionBooking } = require('../controller/bookingRequest/customerDelayResponse');
const { getBookingRequestById } = require('../controller/bookingRequest/getBookingRequest');
const { autoCancelBooking } = require('../controller/bookingRequest/autoCancelBookingRequest');
const listSalonBookingRequests = require('../controller/bookingRequest/listSalonBookingRequests');
const salonBookingRequestSummary = require('../controller/bookingRequest/salonBookingRequestSummary');
const adminListBookingRequests = require('../controller/bookingRequest/adminListBookingRequests');
const adminBookingRequestSummary = require('../controller/bookingRequest/adminBookingRequestSummary');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const bookingRequestRouter = express.Router();

bookingRequestRouter.post('/create-booking-request',authenticateUser, createBookingRequest)
bookingRequestRouter.post('/owner-action/:bookingRequestId',authenticateSalon, ownerActionBooking);
bookingRequestRouter.post('/customer-delay-response/:bookingRequestId',authenticateUser, customerActionBooking);
bookingRequestRouter.get('/get-bookingRequest-by-id/:bookingRequestId',authenticateSalon, getBookingRequestById);
bookingRequestRouter.post('/auto-cancel', autoCancelBooking);

// ── The leads tabs ──────────────────────────────────────────────────────────
// A booking REQUEST is a lead; it is not a booking. These four doors read
// `booking_requests` only.
//
//   salon/list      the salon portal's Booking requests tab
//   salon/summary   its counters (received / accepted / rejected / missed)
//   admin/list      the admin panel's Booking requests tab
//   admin/summary   platform counters + the per-salon answered/missed report
//
// Accept / reject still goes through `/owner-action/:bookingRequestId` above,
// so the web tab, the mobile app and the alert card cannot disagree about what
// an accept does.
bookingRequestRouter.post('/salon/list', authenticateSalon, listSalonBookingRequests);
bookingRequestRouter.post('/salon/summary', authenticateSalon, salonBookingRequestSummary);
bookingRequestRouter.post('/admin/list', authenticateAdmin, adminListBookingRequests);
bookingRequestRouter.post('/admin/summary', authenticateAdmin, adminBookingRequestSummary);







module.exports = bookingRequestRouter;
