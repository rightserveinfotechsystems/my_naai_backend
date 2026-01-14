const cron = require('node-cron');
const { deleteOldNotifications } = require('../src/services/notification.cleanup.service');

cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Notification cleanup cron running');
    await deleteOldNotifications();
});
