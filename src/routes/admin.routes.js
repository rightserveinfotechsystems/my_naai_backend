const express = require('express');
const loginAdmin = require('../controller/admin/adminLogin');
const getProfile = require('../controller/admin/getProfile');
const changePassword = require('../controller/admin/changeAdminPassword');
const createAdmin = require('../controller/admin/createAdmin');
const { authenticateAdmin } = require('../utils/middleware/auth.middleware');
const getUserById = require('../controller/user/getUserById');
const deleteUser = require('../controller/user/deleteUser');
const createAdminPanelUser = require('../controller/admin/create-admin-panel-user');
const getAdminPanelUserList = require('../controller/admin/admin-panel-user-list');
const deleteAdminPanelUser = require('../controller/admin/admin-panel-user-delete');
const updateAdminPanelUser = require('../controller/admin/update-admin-panel-user');
const getAdminById = require('../controller/admin/getAdminById');
const toggleAdminStatus = require('../controller/admin/toggleAdminStatus');

const adminRouter = express.Router();



adminRouter.post('/login', loginAdmin);
adminRouter.get('/profile', authenticateAdmin, getProfile);
adminRouter.post('/change-password', authenticateAdmin, changePassword);
adminRouter.post('/create', createAdmin);

adminRouter.post('/get-user-by-id', authenticateAdmin, getUserById);
adminRouter.post('/delete-user', authenticateAdmin, deleteUser);
adminRouter.post('/create-admin-panel-user', authenticateAdmin, createAdminPanelUser);
adminRouter.post('/admin-panel-user-list', authenticateAdmin, getAdminPanelUserList);
adminRouter.post('/admin-panel-user-delete', authenticateAdmin, deleteAdminPanelUser);
adminRouter.post('/update-admin-panel-user', authenticateAdmin, updateAdminPanelUser);
adminRouter.get('/get-admin-by-id/:userId', authenticateAdmin, getAdminById);
adminRouter.post('/status', authenticateAdmin, toggleAdminStatus);


module.exports = adminRouter;