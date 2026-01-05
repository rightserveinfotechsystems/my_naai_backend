const express = require('express');
const createBarber = require('../controller/Barber/createBarber');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const getBarberProfile = require('../controller/Barber/getBarberProfile');
const { authenticateBarber } = require('../utils/middleware/authBarber.middleware');
const verifyBarberOtpLogin = require('../controller/barber/barberLogin');
const sendBarberOtp = require('../controller/Barber/sendOtp');
const updateBarber = require('../controller/Barber/barberUpdateProfile');
const getBarberList = require('../controller/Barber/barberList');
const toggleStatus = require('../controller/Barber/toggleBarberStatus');
const deleteBarber = require('../controller/Barber/deleteBarber');
const toggleAvailability = require('../controller/Barber/toggleBarberAvailability');


const barberRouter = express.Router();

barberRouter.post('/send-otp', sendBarberOtp);
barberRouter.post('/login', verifyBarberOtpLogin);

//barber authenticate api
barberRouter.get('/get-profile',authenticateBarber,getBarberProfile);
barberRouter.post('/update',authenticateBarber, updateBarber);



//salon autheticate api
barberRouter.post('/create-barber', authenticateSalon, createBarber);
barberRouter.post('/get-barbers-list', authenticateSalon, getBarberList);
barberRouter.post('/toggle-status', authenticateSalon, toggleStatus);
barberRouter.delete('/delete',authenticateSalon,deleteBarber );
barberRouter.post('/toggle-availability', authenticateSalon, toggleAvailability)


module.exports = barberRouter;