// const { Op } = require('sequelize');
// const db = require('../database/models');

// const checkAndMarkExpiredPlans = async () => {
//     const now = new Date();
//     console.log('🔍 Current time:', now.toISOString());

//     try {
//         const expiredSalons = await db.Salon.findAll({
//             where: {
//                 planEndDate: { [Op.lt]: now },
//                 isPlanActive: true,  
//             },
//             limit: 15,
//         });

//         console.log(`Found ${expiredSalons.length} expired plans`);
        
//         if (expiredSalons.length > 0) {
//             for (const salon of expiredSalons) {
//                 console.log(`🔍 BEFORE: ${salon.salonName} → isPlanActive: ${salon.isPlanActive}`);
                
//                 await salon.update({ isPlanActive: false });
                
//                 console.log(`✅ AFTER: ${salon.salonName} → isPlanActive: ${salon.isPlanActive}`);
//             }
//             console.log(`✅ All updates completed!`);
//         } else {
//             console.log('✅ No expired plans found');
//         }
//     } catch (error) {
//         console.error('❌ Plan expiry check failed:', error);
//     }
// };

// module.exports = { checkAndMarkExpiredPlans };

const { Op } = require('sequelize');
const db = require('../database/models');

const checkAndMarkExpiredPlans = async () => {
    const now = new Date();
    const limit = 15;

    console.log('🕒 CRON STARTED at:', now.toISOString());

    try {
        // 🔢 Step 1: Count active salons
        const totalActive = await db.Salon.count({
            where: { isPlanActive: true }
        });

        console.log(`📊 Total Active Salons: ${totalActive}`);

        if (totalActive === 0) {
            console.log('✅ No active salons found');
            return;
        }

        // 📄 Step 2: Calculate total pages
        const totalPages = Math.ceil(totalActive / limit);
        console.log(`📄 Total Pages: ${totalPages} (limit: ${limit})`);

        let totalUpdated = 0;

        // 🔁 Step 3: Loop through pages
        for (let page = 0; page < totalPages; page++) {
            console.log(` Processing Page ${page + 1}/${totalPages}`);

            const salons = await db.Salon.findAll({
                where: { isPlanActive: true },
                limit,
                offset: page * limit,
                order: [['createdAt', 'ASC']]
            });

            console.log(`📦 Fetched ${salons.length} salons`);

            // 🔍 Step 4: Check each salon
            for (const salon of salons) {
                console.log(`🔍 Checking: ${salon.salonName}`);

                if (salon.planEndDate && salon.planEndDate < now) {
                    console.log(`⚠️ Expired → ${salon.salonName}`);

                    await salon.update({ isPlanActive: false });

                    console.log(`✅ Updated → ${salon.salonName} (isPlanActive: false)`);
                    totalUpdated++;
                } else {
                    console.log(`⏳ Still Active → ${salon.salonName}`);
                }
            }
        }

        console.log(`\n🎉 CRON COMPLETED`);
        console.log(`✅ Total Salons Updated: ${totalUpdated}`);

    } catch (error) {
        console.error('❌ Error in plan expiry cron:', error);
    }
};

module.exports = { checkAndMarkExpiredPlans };