const express = require('express');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const getNotificationCount = require('../controller/notification/getSalonNotificationCount');
const getSalonNotifications = require('../controller/notification/getNotification');
const deleteNotifications = require('../controller/notification/deleteNotification');
const checkPlanActive = require('../utils/middleware/checkPlanActive');
const authenticateUser = require('../utils/middleware/authUser.middleware');
const getUserNotifications = require('../controller/notification/getUserNotificationList');
const getUserNotificationCount = require('../controller/notification/getUserNotificationCount');
const notificationRouter = express.Router();

notificationRouter.get('/get-notification-count', authenticateSalon, getNotificationCount);
notificationRouter.get('/get-user-notification-count', authenticateUser, getUserNotificationCount);
notificationRouter.post('/get-salon-notification-list', authenticateSalon, checkPlanActive, getSalonNotifications);
notificationRouter.post('/delete-notification', authenticateSalon, deleteNotifications);
notificationRouter.post('/get-user-notification-list', authenticateUser, getUserNotifications);


module.exports = notificationRouter;