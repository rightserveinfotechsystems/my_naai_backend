const express = require('express');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const createSalon = require('../controller/salon/createSalon');
const getSalonById = require('../controller/salon/getSalonById');
const updateSalon = require('../controller/salon/updateSalon');
const deleteSalon = require('../controller/salon/deleteSalon');
const toggleStatus = require('../controller/salon/toggleSalonStatus');
const toggleOpenClose = require('../controller/salon/toggleOpenCloseSalon');
const verifySalonOtpLogin = require('../controller/salon/salonLogin');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const sendSalonOtp = require('../controller/salon/sendOtp');
const getSalonByIdApp = require('../controller/salon/getSalon');
const updateSalonApp = require('../controller/salon/updateSalonApp');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const listSalonsApp = require('../controller/salon/salonList');
const getSalonByIdUser = require('../controller/salon/getSalonByIdUser');
const listSalons = require('../controller/salon/getSalonList');


const salonRouter = express.Router();

//Salon login
salonRouter.post('/send-otp', sendSalonOtp);
salonRouter.post('/login', verifySalonOtpLogin);
salonRouter.post('/get-salon', authenticateSalon, getSalonByIdApp);
salonRouter.post('/update-salon', authenticateSalon, updateSalonApp);

//user login
salonRouter.post('/salon-list',authenticateUser, listSalonsApp);
salonRouter.post('/get-salon-by-id',authenticateUser, getSalonByIdUser);


// Salon operations
salonRouter.post('/status', toggleStatus);
salonRouter.post('/open-close', toggleOpenClose);


// All routes require admin authentication
salonRouter.use(authenticateAdmin);

// Salon Admin routes
salonRouter.post('/create', createSalon);
salonRouter.get('/get-salon-list', listSalons);
salonRouter.get('/get-salon-by-id/:salonId', getSalonById);
salonRouter.post('/admin-update-salon', updateSalon);
salonRouter.delete('/delete-salon/:salonId', deleteSalon);




module.exports = salonRouter;