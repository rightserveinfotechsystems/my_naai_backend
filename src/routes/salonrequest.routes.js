const express = require('express');
const createSalonRequest = require('../controller/salonRequest/createSalonRequest');
const getSalonRequestList = require('../controller/salonRequest/getSalonRequestList');
const deleteSalonRequest = require('../controller/salonRequest/deleteSalonReq');
const getSalonRequestById = require('../controller/salonRequest/getSalonRequestById');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const salonRequestRouter = express.Router();



salonRequestRouter.post("/create-request", createSalonRequest);

// All routes require admin authentication
salonRequestRouter.use(authenticateAdmin);

salonRequestRouter.post('/get-list', getSalonRequestList);

salonRequestRouter.post('/get-request',getSalonRequestById)

salonRequestRouter.post('/delete-request',deleteSalonRequest );


module.exports = salonRequestRouter;
