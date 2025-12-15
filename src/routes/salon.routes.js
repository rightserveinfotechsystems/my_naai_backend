const express = require('express');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const createSalon = require('../controller/salon/createSalon');
const listSalons = require('../controller/salon/getSalonList');
const getSalonById = require('../controller/salon/getSalonById');
const updateSalon = require('../controller/salon/updateSalon');
const deleteSalon = require('../controller/salon/deleteSalon');
const toggleStatus = require('../controller/salon/toggleSalonStatus');
const toggleOpenClose = require('../controller/salon/toggleOpenCloseSalon');


const salonRouter = express.Router();



// All routes require admin authentication
salonRouter.use(authenticateAdmin);

// Salon Admin routes
salonRouter.post('/', createSalon);
salonRouter.get('/', listSalons);
salonRouter.get('/:salonId', getSalonById);
salonRouter.put('/:salonId', updateSalon);
salonRouter.delete('/:salonId', deleteSalon);
// Salon operations
salonRouter.patch('/:salonId/status', toggleStatus);
salonRouter.patch('/:salonId/open-close', toggleOpenClose);

module.exports = salonRouter;