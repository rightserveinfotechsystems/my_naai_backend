const express = require("express");
const sendNotificationUserAndSalons = require("../controller/adminNotification/sendNotificicationUserAndSalons");
const { authenticateAdmin } = require("../utils/middleware/auth.middleware");
const getAdminNotificationsList = require("../controller/adminNotification/getNotificationList");
const deleteAdminNotification = require("../controller/adminNotification/deleteAdminNotification");
const getNotificationById = require("../controller/adminNotification/getNotificationById");

const adminNotificationRouter = express.Router();

// All routes require admin authentication
adminNotificationRouter.use(authenticateAdmin);

adminNotificationRouter.post('/send-notification-by-admin', sendNotificationUserAndSalons);
adminNotificationRouter.post('/get-admin-notification-list', getAdminNotificationsList);
adminNotificationRouter.post('/delete-admin-notification', deleteAdminNotification);
adminNotificationRouter.get('/get-admin-notification/:notificationId', getNotificationById);




module.exports = adminNotificationRouter;

