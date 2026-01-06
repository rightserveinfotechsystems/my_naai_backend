const db = require('../database/models');
const { Op } = require('sequelize');
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;

/**
 * Create Advertisement
 */
const createAdvertisement = async (advertisementData) => {
    try {
        const { title, images } = advertisementData;
        const advertisement = await db.Advertisement.create({
            title,
            images
        });

        return advertisement;
    } catch (error) {
        throw error;
    }
};

const getAdvertisementById = async (advertisementId) => {
  return db.Advertisement.findByPk(advertisementId);
};

const listAdvertisements = async ({ page = 1, searchString = '' }) => {
  try {
    const limit = DEFAULT_LIMIT;
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const offset = (safePage - 1) * limit;

    const where = {};

    // Search filter
    if (searchString && (searchString = searchString.trim())) {
      const like = `%${searchString}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: like } }
      ];
    }

    // Fetch ads with count for pagination
    const { count: totalAdvertisements, rows: advertisements } = await db.Advertisement.findAndCountAll({
      where,
      attributes: [
        'advertisementId', 'title', 'images', 'status', 'createdAt', 'updatedAt'  
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalAdvertisements / limit) || 1;

    return {
      advertisements,
      page: safePage,
      limit,
      totalAdvertisements,
      totalPages,
    };
  } catch (error) {
    console.error('Error in listAdvertisements service:', error);
    throw error;
  }
};

/**
 * get Advertisement for user
 */

const getActiveAdvertisementForUser = async () => {
  try {
    const ad = await db.Advertisement.findOne({
      where: { status: 'active' }, 
      order: [['createdAt', 'DESC']], 
      attributes: ['advertisementId', 'title', 'images', 'createdAt'],
    });

    return ad;
  } catch (error) {
    console.error('Error in getActiveAdvertisementForUser:', error);
    throw error;
  }
};

/**
 * Update Advertisement
 */
const updateAdvertisement = async (advertisementId, updateData) => {
  try {
    // Find existing ad
    const advertisement = await db.Advertisement.findByPk(advertisementId);

    // Update fields
    await advertisement.update(updateData);

    return advertisement;
  } catch (error) {
    console.error('Error in updateAdvertisement service:', error);
    throw error;
  }
};


module.exports = {
    createAdvertisement,
    getAdvertisementById,
    updateAdvertisement,
    listAdvertisements,
    getActiveAdvertisementForUser
};
