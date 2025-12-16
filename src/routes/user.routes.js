const express = require('express');
const createUser = require('../controller/user/createUser');
const updateUser = require('../controller/user/updateUser');
const loginUser = require('../controller/user/userLogin');
const verifyOtpLogin = require('../controller/user/userLogin');
const sendOtp = require('../controller/user/sendOtp');
const authenticateUser = require('../utils/middleware/authUser.middleware');

// Define your user routes here
const userRouter = express.Router();

userRouter.post('/create',createUser);
userRouter.post('/send-otp', sendOtp);   
userRouter.post('/verify-otp', verifyOtpLogin)
userRouter.post('/:userId',authenticateUser, updateUser);

module.exports = userRouter;