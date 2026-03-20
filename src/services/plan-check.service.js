const { Op } = require('sequelize');
const db = require('../database/models');

const checkAndMarkExpiredPlans = async () => {
    const now = new Date();
    console.log('🔍 Current time:', now.toISOString());

    try {
        const expiredSalons = await db.Salon.findAll({
            where: {
                planEndDate: { [Op.lt]: now },
                isPlanActive: true,  // ✅ camelCase
            },
            limit: 15,
        });

        console.log(`Found ${expiredSalons.length} expired plans`);
        
        if (expiredSalons.length > 0) {
            for (const salon of expiredSalons) {
                console.log(`🔍 BEFORE: ${salon.salonName} → isPlanActive: ${salon.isPlanActive}`);
                
                // 🔥 CORRECT: No destructuring!
                await salon.update({ isPlanActive: false });
                
                console.log(`✅ AFTER: ${salon.salonName} → isPlanActive: ${salon.isPlanActive}`);
            }
            console.log(`✅ All updates completed!`);
        } else {
            console.log('✅ No expired plans found');
        }
    } catch (error) {
        console.error('❌ Plan expiry check failed:', error);
    }
};

module.exports = { checkAndMarkExpiredPlans };
