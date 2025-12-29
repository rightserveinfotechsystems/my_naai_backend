const express = require('express');
const adminRouter = require('./admin.routes');
const salonRouter = require('./salon.routes');
const userRouter = require('./user.routes');
const barberRouter = require('./barber.route');
const bookingRouter = require('./booking.routes');
const routes = express.Router();

// Import module routes


// Mount routes
routes.use('/admin', adminRouter);
routes.use('/salons', salonRouter);
routes.use('/users', userRouter)
routes.use('/barbers', barberRouter)
routes.use('/booking', bookingRouter);


module.exports = routes;