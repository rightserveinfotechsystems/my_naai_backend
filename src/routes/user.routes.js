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
const sendOtpRegister = require('../controller/user/send-otp-register');
const deleteUser = require('../controller/user/deleteUser');
const saveSalon = require('../controller/user/saveSalon');
const removeSavedSalon = require('../controller/user/removeSaveSalon');



// Define your user routes here
const userRouter = express.Router();

userRouter.post('/send-otp-register', sendOtpRegister); 
userRouter.post('/create',createUser);
userRouter.post('/send-otp', sendOtp);   
userRouter.post('/verify-otp', verifyOtpLogin);
userRouter.get('/profile', authenticateUser, getUserById);
userRouter.post('/update', authenticateUser, updateUser);
userRouter.post('/save-salon', authenticateUser, saveSalon);
userRouter.post('/remove-salon', authenticateUser, removeSavedSalon);




userRouter.post('/get-user-list', authenticateAdmin, getUserList);
userRouter.post('/change-user-status',authenticateAdmin, changeUserStatus);
userRouter.post('/delete-user',authenticateAdmin, deleteUser);



module.exports = userRouter;