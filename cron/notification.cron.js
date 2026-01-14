const cron = require('node-cron');
const { deleteOldNotifications } = require('../src/services/notification.cleanup.service');

   // Runs every day at 12:00 AM (midnight)
    cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Daily Notification cleanup cron running at 12:00 AM');

    try {
        await deleteOldNotifications(); // deletes notifications older than 3 days
        console.log('✅ Notification cleanup finished');
    } catch (err) {
        console.error('❌ Error during notification cleanup:', err);
    }
});
