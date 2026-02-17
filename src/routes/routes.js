const express = require('express');
const adminRouter = require('./admin.routes');
const salonRouter = require('./salon.routes');
const userRouter = require('./user.routes');
const barberRouter = require('./barber.route');
const bookingRouter = require('./booking.routes');
const salonRequestRouter = require('./salonrequest.routes');
const ImageRoutes = require('./upload.routes');
const advertisementRouter = require('./advertisement.routes');
const productRouter = require('./product.routes');
const notificationRouter = require('./notification.routes');
const bookingRequestRouter = require('./bookingRequest.routes');


const routes = express.Router();

// Import module routes


// Mount routes
routes.use('/admin', adminRouter);
routes.use('/salons', salonRouter);
routes.use('/users', userRouter)
routes.use('/barbers', barberRouter)
routes.use('/booking', bookingRouter);
routes.use('/salonrequest', salonRequestRouter);
routes.use('/advertisement', advertisementRouter);
routes.use('/products', productRouter);
routes.use('/notifications',notificationRouter);
routes.use('/bookingRequest',bookingRequestRouter);

routes.use('/upload', ImageRoutes);


module.exports = routes;