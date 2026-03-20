const cron = require("node-cron");
const { checkAndMarkExpiredPlans } = require('../src/services/plan-check.service');
cron.schedule("0 1 * * *", async () => {
    console.log("📅 CRON: Checking expired salon plans...");

    try {
        await checkAndMarkExpiredPlans(); // marks expired salon plans as inactive
        console.log('✅ Plan expiry check finished');
    } catch (err) {
        console.error('❌ Error during plan expiry check:', err);
    }
});

