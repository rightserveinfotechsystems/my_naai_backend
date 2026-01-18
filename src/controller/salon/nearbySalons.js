const { Op, literal } = require('sequelize');
const db = require('../../database/models');


const RADIUS_KM = parseFloat(process.env.NEARBY_SALON_RADIUS) || 5;
const PAGE_LIMIT = parseInt(process.env.PAGE_LIMIT, 10) || 20;


const getNearbySalons = async (req, res) => {
    try {
        const { latitude, longitude, onlyOpen = false } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User latitude & longitude are required'
            });
        }

        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const maxDistance = RADIUS_KM;

        // Haversine formula
        const distanceFormula = `(6371 * acos(
            cos(radians(${userLat})) 
            * cos(radians("latitude")) 
            * cos(radians("longitude") - radians(${userLng})) 
            + sin(radians(${userLat})) 
            * sin(radians("latitude"))
        ))`;

        const whereCondition = { isActive: true };
        if (onlyOpen === 'true') whereCondition.isOpen = true;

        // Step 1: get all matching salons with distance computed
        let salons = await db.Salon.findAll({
            attributes: {
                include: [[literal(distanceFormula), 'distance']]
            },
            where: whereCondition,
            order: literal(`${distanceFormula} ASC`) // sort by distance
        });

        // Step 2: filter in JS for radius
        salons = salons.filter(s => parseFloat(s.get('distance')) <= maxDistance);

        // Step 3: fallback if no nearby salons
        if (!salons.length) {
            salons = await db.Salon.findAll({
                where: whereCondition,
                order: [['createdAt', 'DESC']],
                limit: PAGE_LIMIT
            });
        }

        return res.status(200).json({
            status: 'SUCCESS',
            count: salons.length,
            data: salons
        });

    } catch (error) {
        console.error('Nearby Salon Error:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        });
    }
};

module.exports = { getNearbySalons };


