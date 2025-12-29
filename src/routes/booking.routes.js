const express = require('express');
const { createBooking } = require('../controller/booking/addBooking');
const authenticateUser = require('../utils/middleware/authUser.middleware');

const bookingRouter = express.Router();

bookingRouter.post('/book',authenticateUser, createBooking);

module.exports = bookingRouter;