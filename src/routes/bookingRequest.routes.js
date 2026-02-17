const express = require('express');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const { createBookingRequest } = require('../controller/bookingRequest/bookingRequest');
const bookingRequestRouter = express.Router();

bookingRequestRouter.post('/create-appointment',authenticateUser, createBookingRequest)
module.exports = bookingRequestRouter;
