const express = require('express');
const loginAdmin = require('../controller/admin/adminLogin');
const getProfile = require('../controller/admin/getProfile');
const changePassword = require('../controller/admin/changeAdminPassword');
const createAdmin = require('../controller/admin/createAdmin');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const adminRouter = express.Router();



adminRouter.post('/login', loginAdmin);
adminRouter.get('/profile', authenticateAdmin, getProfile);
adminRouter.post('/change-password', authenticateAdmin, changePassword);
adminRouter.post('/create', createAdmin);


module.exports = adminRouter;