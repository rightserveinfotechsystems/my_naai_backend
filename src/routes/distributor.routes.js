const express = require('express');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const listDistributors = require('../controller/distributor/listDistributors');
const createDistributor = require('../controller/distributor/createDistributor');
const updateDistributor = require('../controller/distributor/updateDistributor');
const loginDistributor = require('../controller/distributor/loginDistributor');
const updateDistributorLocation = require('../controller/distributor/updateDistributorLocation');
const { authenticateDistributorOrAdmin } = require('../utils/middleware/authDistributorOrAdmin.middleware');

// Delivery partners (company admin). Orders get a distributorId via
// /api/shop-orders/admin-assign-distributor; the distributor then accepts or
// rejects from the portal with /api/distributors/login.
const distributorRouter = express.Router();
distributorRouter.post('/login', loginDistributor);
distributorRouter.post('/list', authenticateAdmin, listDistributors);
distributorRouter.post('/create', authenticateAdmin, createDistributor);
distributorRouter.post('/update', authenticateAdmin, updateDistributor);
// Live/pinned location. A distributor refreshes its own row from the portal;
// the admin token is accepted too (with `distributorId`) while correcting a pin.
distributorRouter.post('/location', authenticateDistributorOrAdmin, updateDistributorLocation);

module.exports = distributorRouter;
