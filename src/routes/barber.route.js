const express = require('express');
const createBarber = require('../controller/Barber/createBarber');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const sendBarberOtp = require('../controller/Barber/sendOtp');
const verifyBarberOtpLogin = require('../controller/Barber/barberLogin');
const barberRouter = express.Router();


barberRouter.post('/send-otp', sendBarberOtp);
barberRouter.post('/login', verifyBarberOtpLogin);

//salon autheticate api
barberRouter.post('/create', authenticateSalon, createBarber);


module.exports = barberRouter;