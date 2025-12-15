const express = require('express');
const adminRouter = require('./admin.routes');
const salonRouter = require('./salon.routes');
const routes = express.Router();

// Import module routes


// Mount routes
routes.use('/admin', adminRouter);
routes.use('/salons', salonRouter);

module.exports = routes;