const express = require('express');
const { authenticateSalon } = require('../utils/middleware/authSalon.middleware');
const getNotificationCount = require('../controller/notification/getSalonNotificationCount');
const getSalonNotifications = require('../controller/notification/getNotification');
const deleteNotifications = require('../controller/notification/deleteNotification');
const notificationRouter = express.Router();

notificationRouter.get('/get-notification-count', authenticateSalon, getNotificationCount);
notificationRouter.post('/get-notification-list', authenticateSalon, getSalonNotifications);
notificationRouter.post('/delete-notification', authenticateSalon, deleteNotifications);

module.exports = notificationRouter;