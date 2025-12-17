const express = require('express');
const createUser = require('../controller/user/createUser');
const updateUser = require('../controller/user/updateUser');
const loginUser = require('../controller/user/userLogin');
const verifyOtpLogin = require('../controller/user/userLogin');
const sendOtp = require('../controller/user/sendOtp');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const getUserById = require('../controller/user/getUserById');
// const authenticateAdmin = require('../utils/middleware/authAdmin.middleware');
const getUserList = require('../controller/user/getUserList');
const {authenticateAdmin } = require('../utils/middleware/auth.middleware');
const changeUserStatus = require('../controller/user/disableUser');


// Define your user routes here
const userRouter = express.Router();

userRouter.post('/create',createUser);
userRouter.post('/send-otp', sendOtp);   
userRouter.post('/verify-otp', verifyOtpLogin)
userRouter.post('/get-user-by-id', authenticateUser, getUserById)
userRouter.post('/update', authenticateUser, updateUser);

userRouter.post('/get-user-list', getUserList);
userRouter.post('/change-user-status', changeUserStatus);

module.exports = userRouter;