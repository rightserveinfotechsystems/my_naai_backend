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
const adminBookingRequestAction = require('../controller/bookingRequest/adminBookingRequestAction');
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
// A salon's accept / reject goes through `/owner-action/:bookingRequestId` and
// an admin's through `/admin/action/:bookingRequestId`; both are thin wrappers
// over `services/bookingRequestAction.service.js`, so the web tab, the mobile
// app and the alert card cannot disagree about what an accept does.
bookingRequestRouter.post('/salon/list', authenticateSalon, listSalonBookingRequests);
bookingRequestRouter.post('/salon/summary', authenticateSalon, salonBookingRequestSummary);
bookingRequestRouter.post('/admin/list', authenticateAdmin, adminListBookingRequests);
bookingRequestRouter.post('/admin/summary', authenticateAdmin, adminBookingRequestSummary);

// An admin answering on a salon's behalf. It is NOT a second accept
// implementation: it calls the same `applyRequestAction` as `/owner-action`
// above, with an ADMIN actor, so the answer window, the "already actioned"
// guard, the row lock and the one-booking-per-request rule are the same code.
// `acted_by_role` / `acted_by_admin_id` / `on_behalf_of_salon` record who
// answered, and the salon is notified.
bookingRequestRouter.post('/admin/action/:bookingRequestId', authenticateAdmin, adminBookingRequestAction);







module.exports = bookingRequestRouter;
